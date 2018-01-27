var express = require('express');
var router = express.Router();
var axios = require('axios');
require('dotenv').config();
var jsonfile = require('jsonfile');
const loadJsonFile = require('load-json-file')

const apiKey = {'X-Riot-Token' : process.env.API_KEY};
const RUL_ACC = process.env.RUL_ACC;
const MAN_ACC = process.env.MAN_ACC;
const LOON_ACC = process.env.LOON_ACC;
const JC_ACC = process.env.JC_ACC;
const TER_ACC = process.env.TER_ACC;

let accountId = MAN_ACC;
let ACCOUNT_2 = JC_ACC;

const baseUrl = 'https://na1.api.riotgames.com/lol';

router.get('/', function(req, res, next){
  res.send('welcome to this page lol')
})

router.get('/fakeData', function (req, res, next) {
  var file = 'newSample.json'
  loadJsonFile(file).then( data =>{
    res.send(data)
  }).catch(err => console.log(err))
  // jsonfile.readFile(file, function (err, obj) {
  //   if (err) {console.log(err); return}
  //   console.log(obj)
  //   res.send(obj)
  // })
})

/* GET home page. */
router.get('/sumNameId/:name', function(req, res, next) {
  //get funciton returns a promise
  //then takes in a promise and a callback that handles the reponse of that promise
  //catch is used if fails
  axios.get(
    `${baseUrl}/summoner/v3/summoners/by-name/${req.params.name}`,
    { headers: apiKey })
    .then(function(response){
      console.log(response.data)
      res.send(response.data);
    })
    .catch(function(error){
        console.log(error);
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



router.get('/findFriend/', function(req, res, next){
  const numGames = 3;
  const url = `${baseUrl}/match/v3/matchlists/by-account/${accountId}?endIndex=${numGames}`;

  axios.get(url, {headers: apiKey}) //get list of matches
  .then(function(response){ //TODO get rid of then since no async is done
    let matchList = response.data.matches
      .slice(0,numGames)//first 4 elements of the array (4 matches)
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
    console.log(matchList.length +" matches, so that many requests")
    matchList.map(x => { //for each match, get a full match details
      let url = `${baseUrl}/match/v3/matches/${x.gameId}`;
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
    let filteredData = promisedVal.map(x => {
      return x.data;
    })
    let foundName;
    let gamesWithFriend = filteredData.filter(match => {//each game
      match.participantIdentities = match.participantIdentities.filter( identity => { //if match, return player obj
        return identity.player.accountId == ACCOUNT_2 || identity.player.accountId == accountId
      })//TODO figure out if this is a safe way of making sure
      return match.participantIdentities[0] && match.participantIdentities[1]
    })

    let quickInfo = {
      sumName: null,
      champId: null,
      sumIndex: null,
      friend: null,
      friendChamp: null,
      friendIndex: null
    }

    //pull out information about the two summoners
    gamesWithFriend.map(x => {
      let info = (x.participantIdentities);
      let nameIndex = (info[0].player.accountId == accountId ? 0 : 1);
      let team = (info[0].participantId > 5 ? 200 : 100 ) / 100 - 1;

      quickInfo.sumName = info[nameIndex].player.summonerName;
      quickInfo.sumIndex = info[nameIndex].participantId;
      quickInfo.champId = x.participants[quickInfo.sumIndex -1].championId;
      quickInfo.lane = x.participants[quickInfo.sumIndex -1].timeline.lane


      quickInfo.friend = info[1-nameIndex].player.summonerName;
      quickInfo.friendIndex = info[1-nameIndex].participantId;
      quickInfo.friendChamp = x.participants[quickInfo.friendIndex -1].championId;
      quickInfo.friendLane = x.participants[quickInfo.friendIndex -1].timeline.lane

      quickInfo.team = team;
      quickInfo.win = x.teams[quickInfo.team].win


      console.log("info ");
      console.log(quickInfo)
      //TODO find a way to copy objects
      x.quickInfo = Object.assign({}, quickInfo);
      //TODO figure out if this works
      //x.quickInfo = quickInfo
    })

    let champs = []
    //TODO already have a gamesWithFriend map above, remove duplicate code
    gamesWithFriend.map( x => { // for each game, find each champ name
      let champID = x.quickInfo.champId
      let friendChampId = x.quickInfo.friendChamp

      //nothing here is asynchronous, linear execution
      champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${champID}`, {headers: apiKey}))
      champs.push(axios.get(`${baseUrl}/static-data/v3/champions/${friendChampId}`, {headers: apiKey}))
    })
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
    })
  .then(function(dataWithChamps){
    //got all of the data at the end
    console.log('got all of the data at the end');
    res.send(dataWithChamps)
  })
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
