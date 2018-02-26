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
  console.log("searching riot api for user ");
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
      console.log(response);
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

/*
TODO refactor matchlist to just return reponse.data.matches.map()
TODO get rid of logs
*/

router.get('/teamMatches/:region/:userID/', function(req, res, next){
  let region = req.params.region;
  let mainID = req.params.userID;
  let numGames = 15;
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
      //console.log("array of players");
      // console.log(playerArray);
      matchInformation.players = playerArray;
      matchInformation.playersObj = teamMatesInMatch;
      // matchInformation.team = team;
      matchInformation.mainUserIndex = mainUserIndex -1;
      matchInformation.gameCreation = match.gameCreation;
      matchInformation.length = match.gameDuration;
      matchInformation.queue = match.queueId;
      matchInformation.team = match.teams[team];
      matchInformation.matchId = match.gameId;

      // console.log(matchInformation);
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
