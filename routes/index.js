var express = require('express');
var router = express.Router();
var axios = require('axios');
require('dotenv').config();
const loadJsonFile = require('load-json-file')

const apiKey = {'X-Riot-Token' : process.env.API_KEY};
const RUL_ACC = process.env.RUL_ACC;
const MAN_ACC = process.env.MAN_ACC;
const LOON_ACC = process.env.LOON_ACC;
const JC_ACC = process.env.JC_ACC;
const TER_ACC = process.env.TER_ACC;

let accountId = MAN_ACC;
let ACCOUNT_2 = TER_ACC;

// let baseUrl = 'https://na1.api.riotgames.com/lol';
let baseUrl = 'api.riotgames.com/lol';

router.get('/demoData', function (req, res, next) {
  var file = 'newFormat.json'
  loadJsonFile(file).then( data =>{
    res.json(data)
  }).catch(err => console.log(err))
})

router.get('/queues', function(req, res, next){
  var file = 'formatQueues.json'
  loadJsonFile(file).then( data =>{
    res.json(data)
  }).catch(err => console.log(err))
})

router.get("/champions", function(req, res, next){
  var file = 'champions.json'
  loadJsonFile(file).then( data =>{
    res.json(data)
  }).catch(err => console.log(err))
});

router.get('/sumNameId/:region/:name', function(req, res, next) {
  //get function returns a promise
  //then passes another promise to a callback
  //catch is used if fails
  //TODO if 404 returned for not existing, also return 404??
  let reqUrl = `https://${req.params.region}.${baseUrl}`
  axios.get(
    `${reqUrl}/summoner/v3/summoners/by-name/${req.params.name}`,
    { headers: apiKey })
    .then(function(response){
      console.log(response.data)
      console.log(response.headers);
      res.send(response.data);
    })
    .catch(function(error){
        res.status(404).send("nothing was found")
        if(error.response){
          console.log(res.response);
        } else if(error.request){
          console.log(error.request);
        } else{
          console.log(error.message);
        }
    });
});

router.get('/matchList/', function(req, res, next){
  const url = `${baseUrl}/match/v3/matchlists/by-account/${accountId}`;
  axios.get(url, {
    headers: apiKey
  })
  .then(function(response){
    response.data.matches = response.data.matches.slice(0,4);
    console.log(response.data);
    res.send(response.data);
  }).catch(function(error){
    console.log(error);
  })
});


/*
TODO refactor matchlist to just return reponse.data.matches.map()
TODO get rid of logs
*/
router.get('/matchListPromise/', function(req, res, next){
  const url = `${baseUrl}/match/v3/matchlists/by-account/${accountId}`;

  axios.get(url, {headers: apiKey}) //get list of matches
  .then(function(response){
    let matchList = response.data.matches
      .slice(0,4)//first 4 elements of the array (4 matches)
      .map(x => (
        {
          gameId: x.gameId,
          champion: x.champion,
          lane: x.lane
        })
    );
    return matchList;
  })//give list of matches over
  .then(function(matchList){
    console.log("list of matches")
    console.log(matchList);
    let promises = [] //this will hold all requests as promises to be run concurrently
    matchList.map(x => { //for each match, get a full match details
      let url = `${baseUrl}/match/v3/matches/${x.gameId}`;
      promises.push(axios.get(url, {headers: apiKey}));
    })
    return Promise.all(promises)
      .then(function(allPromiseValues){
        console.log("here are all the values");
        return allPromiseValues;
      })
      .catch(function (error) {
        console.log("no data");
        console.log(error);
      })
  })
  .then(function(promisedVal){
    console.log("received all promise val finally");
    res.send(promisedVal.map(x => {
      return x.data;
    }))
  })
  .catch(function(error){
    console.log("there was an error");
    console.log(error);
    res.send(error)
  })
})



router.get('/findFriend/:region/:acc1/:acc2', function(req, res, next){
  console.log("find friend");
  const numGames = 10;
  let reqUrl = `https://${req.params.region}.${baseUrl}`
  const matchesUrl = `${reqUrl}/match/v3/matchlists/by-account/${req.params.acc1}?endIndex=${numGames}`;

  axios.get(matchesUrl, {headers: apiKey}) //get list of matches
  .then(function(response){
    console.log(response.headers)
    let matchList = response.data.matches
      // .slice(0,numGames)//first 4 elements of the array (4 matches)
      .map(x => (
        {
          gameId: x.gameId,
          champion: x.champion,
          lane: x.lane
        })
    );
    // console.dir(response.headers);
    console.log("matchlist after first getting data");
    console.log(matchList);
    return matchList;
  })//give list of matches over
  //TODO get rid of then since no async is done
  .then(function(matchList){
    console.log("list of matches")
    console.log(matchList);
    let promises = [] //this will hold all requests as promises to be run concurrently
    console.log(matchList.length +" matches, so that many requests")
    matchList.map(x => { //for each match, get a full match details
      let reqUrl = `https://${req.params.region}.${baseUrl}`
      let url = `${reqUrl}/match/v3/matches/${x.gameId}`;
      promises.push(axios.get(url, {headers: apiKey}));
    })
    return Promise.all(promises)//for each match, get a full match details
      .then(function(allPromiseValues){
        console.log("here are all the values");
        return allPromiseValues;
      })
      .catch(function (error) {
        console.log("no data");
        console.log(error);
      })
  })
  .then(function(promisedVal){//receive data, format it
    console.log("received all promise values finally");
    let filteredData = promisedVal.map(singlePromise => {
      console.log(singlePromise.headers)
      return singlePromise.data;
    })
    let gamesWithFriend = filteredData.filter(match => {//each game
      match.participantIdentities = match.participantIdentities.filter( identity => { //if match, return player obj
        return identity.player.accountId == req.params.acc2 || identity.player.accountId == req.params.acc1
      })//TODO figure out if this is a safe way of making sure
      return match.participantIdentities[0] && match.participantIdentities[1]
    })

    let quickInfo = {
      "players" : [
        {
          sumName: null,
          champId: null,
          sumIndex: null,
        },
        {
          sumName: null,
          champId: null,
          sumIndex: null,
        }
      ]
    }
    // todo: do not use map since we are not returning a new array
    // TODO: also return iconUrl
    // TODO: return a player object for each player
    // pull out information about the two summoners
    let champs = []
    gamesWithFriend.map(x => {
      let identities = x.participantIdentities;
      let participants = x.participants;
      let identityIndex = (identities[0].player.accountId == req.params.acc1 ? 0 : 1);
      let team = (identities[0].participantId > 5 ? 200 : 100 ) / 100 - 1;
      console.log("team ", team)//should be 1 or 0

      // let player1 = quickInfo.players[0];
      // player1.sumName = identities[identityIndex].player.summonerName;
      // let sumIndex = identities[identityIndex].participantId - 1;
      // player1.icon = identities[identityIndex].player.profileIcon;
      // player1.sumIndex = sumIndex;
      // player1.champId = participants[sumIndex].championId;
      // player1.lane = participants[sumIndex].timeline.lane
      // player1.champLvl = participants[sumIndex].stats.champLevel;

      // console.log(player1)
      // let player2 = quickInfo.players[1];
      // player2.sumName = identities[1-identityIndex].player.summonerName;
      // sumIndex = identities[1-identityIndex].participantId -1;
      // player2.icon = identities[1-identityIndex].player.profileIcon;
      // player2.sumIndex = sumIndex;
      // player2.champId = participants[sumIndex].championId;
      // player2.lane = participants[sumIndex].timeline.lane
      // console.log(player2)

      //for each player, fill in their part of quickInfo
      let sumIndex;
      for ( const [index, onePlayer] of quickInfo.players.entries()) {
        let playerIdentity = (index == 0 ? identityIndex : 1-identityIndex);
        onePlayer.sumName = identities[playerIdentity].player.summonerName;
        sumIndex = identities[playerIdentity].participantId -1;
        onePlayer.icon = identities[playerIdentity].player.profileIcon;
        onePlayer.sumIndex = sumIndex;
        onePlayer.champId = participants[sumIndex].championId;
        onePlayer.lane = participants[sumIndex].timeline.lane;
        onePlayer.stats = participants[sumIndex].stats
      }

      quickInfo.team = team;
      quickInfo.win = participants[sumIndex].stats.win
      quickInfo.date = x.gameCreation;
      quickInfo.length = x.gameDuration;
      quickInfo.queue = x.queueId;
      quickInfo.gameId = x.gameId

      // champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${player1.champId}`, {headers: apiKey}))
      // champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${player2.champId}`, {headers: apiKey}))
      // champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${player1.champId}`, {headers: apiKey}))
      // champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${player2.champId}`, {headers: apiKey}))

      console.log("quickinfo");
      console.log(quickInfo)
      //TODO find a way to copy objects
      let clone = JSON.parse(JSON.stringify(quickInfo))
      x.quickInfo = clone;

      //cannot do these, need a deep clone
      // Object.assign(x.quickInfo, quickInfo);
      //TODO figure out if this works
      //x.quickInfo = quickInfo
    })

    res.send(gamesWithFriend)


    //TODO already have a gamesWithFriend map above, remove duplicate code
    // gamesWithFriend.map( x => { // for each game, find each champ name
    //   let champID = x.quickInfo.players[0].champId
    //   let friendChampId = x.quickInfo.players[1].champId

    //   //nothing here is asynchronous, linear execution
    //   champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${champID}`, {headers: apiKey}))
    //   champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${friendChampId}`, {headers: apiKey}))
    // })

    /*
    return Promise.all(champs) // array has 2x number of matches
       .then(function(dataWithChamps){//array with champData
         console.log("champ data");
         // return gamesWithFriend
         dataWithChamps.map(champResponse => {//for every champ request
           gamesWithFriend.push(champResponse.data)
         })
         // gamesWithFriend.push(dataWithChamps)
         console.log("returning data with champ names also");
         return gamesWithFriend
       })
       .catch(function(error){
         console.log("unable to get champion");
         console.log(error.response)
       })
       */
    })
  // .then(function(dataWithChamps){
  //   //got all of the data at the end
  //   console.log('got all of the data at the end');
  //   res.send(dataWithChamps)
  // })
  .catch(function(error){
    console.log("there was an error");
    console.log(error);
    res.send(error)
  })
})

router.get('/champion/:id', function(req, res, next){
  axios.get(`${baseUrl}/static-data/v3/champions/${req.params.id}`, {headers: apiKey})
    .then(function (response) {
      res.send(response.data)
    })
    .catch(function(error){
      console.log("unable to get champ")
      console.log(error.response);
    })
});

module.exports = router;
