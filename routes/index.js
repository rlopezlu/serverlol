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
  var file = 'matchDataFinal.json'
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
  const url = `https://na1.${baseUrl}/match/v3/matchlists/by-account/${accountId}`;

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
      let url = `https://na1.${baseUrl}/match/v3/matches/${x.gameId}`;
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


router.get('/matches/:region/:userID/', function(req, res, next){
  let region = req.params.region;
  let mainID = req.params.userID;
  let numGames = 10;
  const url = `https://${region}.${baseUrl}`
    +`/match/v3/matchlists/by-account/${mainID}?endIndex=${numGames}`;

  axios.get(url, {headers: apiKey}) //get list of matches
  .then(function(response){
    let matchList = response.data.matches.map(match =>
      ({gameId: match.gameId}));
    return matchList;
  })//give list of matches over
  .then(function(matchList){
    console.log("list of matches")
    console.log(matchList);
    let promises = [] //this will hold all requests as promises to be run concurrently
    matchList.map(match => { //for each match, get a full match details
      let url = `https://${region}.${baseUrl}/match/v3/matches/${match.gameId}`;
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
    //for each match response, get only the match data
    let matches = promisedVal.map(singlePromise => {
      console.log(singlePromise.headers)
      return singlePromise.data;
    })
    // todo: do not use map since we are not returning a new array
    let myMap = new Map();
    finalMatches = matches.map(match => {
      // TODO: is it faster to find the team, user index first?
      let identities = match.participantIdentities;
      let participants = match.participants;
      let matchInformation = {};
      let playerArray = [];
      let mainUserIndex;
      let team = -1;
      //entries creates an iterator for the array
      let participantsIterator = participants.entries();

      for(const [index, onePlayer] of identities.entries()){
        if(team === 0 && index === 5) break;
        let participant = participantsIterator.next().value[1];
        let playerObj = {}
        let currentId = onePlayer.player.accountId;
        if(currentId == mainID) {
          mainUserIndex = onePlayer.participantId
          team = mainUserIndex > 5 ? 1 : 0;
        }
        //all the properties from identities
        playerObj.accountId = currentId;
        if(myMap.has(currentId)){
          myMap.set(currentId, myMap.get(currentId) + 1)
        } else {
          myMap.set(currentId, 1)
        }
        playerObj.playerIndex = onePlayer.participantId
        playerObj.sumName = onePlayer.player.summonerName;
        playerObj.icon = onePlayer.player.profileIcon;

        //all the properties from participants
        playerObj.championId = participant.championId;
        playerObj.stats = participant.stats;
        playerObj.lane = participant.timeline.lane;

        playerArray.push(playerObj);
      }
      if(team ===1){
        playerArray.splice(0,5)
      }
      console.log("array of players");
      // console.log(playerArray);
      matchInformation.players = playerArray;
      // matchInformation.team = team;
      matchInformation.mainUserIndex = mainUserIndex -1;
      matchInformation.gameCreation = match.gameCreation;
      matchInformation.length = match.gameDuration;
      matchInformation.queue = match.queueId;
      matchInformation.team = match.teams[team];
      console.log(matchInformation);
      return matchInformation;
    })

    myMap.forEach(function(val, key){
      if(val > 1)
        console.log(key + " "+ val);
    });
    res.json(matches);
    // res.json(finalMatches);
  })
  .catch(function(error){
    console.log("there was an error");
    console.log(error);
    res.send(error)
  })
})



router.get('/teamMatches/:region/:userID/', function(req, res, next){
  let region = req.params.region;
  let mainID = req.params.userID;
  let numGames = 10;
  const url = `https://${region}.${baseUrl}`
    +`/match/v3/matchlists/by-account/${mainID}?endIndex=${numGames}`;

  axios.get(url, {headers: apiKey}) //get list of matches
  .then(function(response){
    let matchList = response.data.matches.map(match =>
      ({gameId: match.gameId}));
    return matchList;
  })//give list of matches over
  .then(function(matchList){
    console.log("list of matches")
    console.log(matchList);
    let promises = [] //this will hold all requests as promises to be run concurrently
    matchList.map(match => { //for each match, get a full match details
      let url = `https://${region}.${baseUrl}/match/v3/matches/${match.gameId}`;
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
    //for each match response, get only the match data
    let matches = promisedVal.map(singlePromise => {
      console.log(singlePromise.headers)
      return singlePromise.data;
    })

    let requestInfo = {}
    let myMap = new Map();
    let teamIdentities = new Map();
    let teamMates = {};
    let playerIdentities = {}
    let mainUser = {}
    finalMatches = matches.map(match => {
      // TODO: is it faster to find the team, user index first?

      let identities = match.participantIdentities;
      let participants = match.participants;
      let matchInformation = {};
      let playerArray = [];
      let teamMatesInMatch = {}
      let mainUserIndex;
      let team = -1;
      //entries creates an iterator for the array
      let participantsIterator = participants.entries();

      //iterate through each player identity
      for(const [index, onePlayer] of identities.entries()){

        if(team === 0 && index === 5) break;
        let participant = participantsIterator.next().value[1];
        let playerObj = {}
        let currentId = onePlayer.player.accountId;
        let playerName;

        if(currentId == mainID) {
          mainUserIndex = onePlayer.participantId
          team = mainUserIndex > 5 ? 1 : 0;
          mainUser = {
            name: onePlayer.player.summonerName,
            icon: onePlayer.player.profileIcon,
            id: currentId
          }
        }
        //all the properties from identities
        playerObj.accountId = currentId;
        let commonTeamMate = {
          name: onePlayer.player.summonerName,
          icon: onePlayer.player.profileIcon,
          id: currentId,
          count: 1
        }
        if(myMap.has(currentId)){
          commonTeamMate.count = myMap.get(currentId).count + 1
          myMap.set(currentId, commonTeamMate)
        } else {
          myMap.set(currentId, commonTeamMate)
        }
        playerObj.playerIndex = onePlayer.participantId
        playerObj.sumName = onePlayer.player.summonerName;
        playerObj.icon = onePlayer.player.profileIcon;

        //all the properties from participants
        playerObj.championId = participant.championId;
        playerObj.stats = participant.stats;
        playerObj.lane = participant.timeline.lane;

        teamMatesInMatch[onePlayer.player.summonerName] = [playerObj]
        playerArray.push(playerObj);
      }
      if(team ===1){
        playerArray.splice(0,5)
      }
      console.log("array of players");
      // console.log(playerArray);
      matchInformation.players = playerArray;
      matchInformation.playersObj = teamMatesInMatch;
      // matchInformation.team = team;
      matchInformation.mainUserIndex = mainUserIndex -1;
      matchInformation.gameCreation = match.gameCreation;
      matchInformation.length = match.gameDuration;
      matchInformation.queue = match.queueId;
      matchInformation.team = match.teams[team];

      console.log(matchInformation);
      return matchInformation;
    }) //end of .map, returns finalMatches

    myMap.forEach(function(val, key){
      if(val.count < 2 || key == mainID)
        // console.log(key + " "+ val);
        myMap.delete(key);
    });

    let commonPlayers = []
    myMap.forEach(function(val, key){
      commonPlayers.push(myMap.get(key));
    })
    // res.json(matches);
    let toReturn = {
      matches:finalMatches,
      commonPlayers: commonPlayers,
      mainUser: mainUser
    }
    // let commonPlayers = JSON.stringify([...myMap])
    console.log(commonPlayers);
    res.json(toReturn);
  })
  .catch(function(error){
    console.log("there was an error");
    console.log(error);
    res.send(error)
  })
})


router.get('/findFriend/:region/:acc1/:acc2', function(req, res, next){
  let mainID = req.params.acc1;
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
    let matches = promisedVal.map(singlePromise => {
      console.log(singlePromise.headers)
      return singlePromise.data;
    })
    // TODO: refactor so we use one or the o
    // let gamesWithFriend = filteredData;
    // let gamesWithFriend = filteredData.filter(match => {//each game
    //   match.participantIdentities = match.participantIdentities.filter( identity => { //if match, return player obj
    //     return identity.player.accountId == req.params.acc2 || identity.player.accountId == req.params.acc1
    //   })//TODO figure out if this is a safe way of making sure
    //   return match.participantIdentities[0] && match.participantIdentities[1]
    // })

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
    matches.map(match => {
      let identities = match.participantIdentities;
      let participants = match.participants;
      //TODO find team of user
      //TODO find index of user
      // let identityIndex = (identities[0].player.accountId == req.params.acc1 ? 0 : 1);
      // let team = (identities[0].participantId > 5 ? 200 : 100 ) / 100 - 1;
      console.log("team ", team)//should be 1 or 0

      //for each player, fill in their part of quickInfo
      /// TODO: replace below with loop that iterates over each players
      // TODO: what does entries() do
      let playerArray = [];
      for(const [index, onePlayer] of identities.entries()){
        let playerObj = {}
        playerObj.accountId = onePlayer.accountId;
        playerObj.sumName = onePlayer.summonerName;
        playerObj.icon = onePlayer.profileIcon;
        playerArray.push(playerObj);
      }
      console.log("array of players");

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
    })
  .catch(function(error){
    console.log("there was an error");
    console.log(error);
    res.send(error)
  })
})



//return full match history for one player
router.get('/matchHistory/:region/:acc1', function(req, res, next){
  console.log("Match history");
  const numGames = 10;
  let reqUrl = `https://${req.params.region}.${baseUrl}`
  const matchesUrl = `${reqUrl}/match/v3/matchlists/by-account/${req.params.acc1}?endIndex=${numGames}`;

  axios.get(matchesUrl, {headers: apiKey}) //get list of matches
  .then(function(response){
    console.log(response.headers)
    // TODO: get rid of champion and lane
    let matchList = response.data.matches.map(x => (
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
    matchList.map(match => { //for each match, get a full match details
      let reqUrl = `https://${req.params.region}.${baseUrl}`
      let url = `${reqUrl}/match/v3/matches/${match.gameId}`;
      promises.push(axios.get(url, {headers: apiKey}));
    })
    return Promise.all(promises)//for each match, get a full match details
      .then(function(allPromiseValues){
        console.log("getting details for each match");
        return allPromiseValues;
      })
      .catch(function (error) {
        console.log("no data when trying to get all matches");
        console.log(error);
      })
  })
  .then(function(promisedVal){//receive full matches data, format it
    console.log("received all matches and details");
    let filteredData = promisedVal.map(singlePromise => {
      console.log(singlePromise.headers)
      return singlePromise.data;
    })
    // TODO: Get rid of this
    // TODO: Get rid of this
    // TODO: Get rid of this
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
    // TODO: do not use map since we are not returning a new array
    // pull out information about the two summoners
    let champs = []
    gamesWithFriend.map(x => {
      let identities = x.participantIdentities;
      let participants = x.participants;
      let identityIndex = (identities[0].player.accountId == req.params.acc1 ? 0 : 1);
      let team = (identities[0].participantId > 5 ? 200 : 100 ) / 100 - 1;
      console.log("team ", team)//should be 1 or 0

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


      console.log("quickinfo");
      console.log(quickInfo)
      //TODO find a way to deep copy objects
      let clone = JSON.parse(JSON.stringify(quickInfo))
      x.quickInfo = clone;

      //cannot do these, need a deep clone
      // Object.assign(x.quickInfo, quickInfo);
      //TODO figure out if this works
      //x.quickInfo = quickInfo
    })
    res.send(gamesWithFriend)
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
