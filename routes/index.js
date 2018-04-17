var express = require('express');
var router = express.Router();
var axios = require('axios');
require('dotenv').config();
const loadJsonFile = require('load-json-file')

//TODO make sure region is working correctly everywhere it is needed
//TODO make sure version is checked for daily, update it as needed
//TODO get champion data using champion/id endpoing
// TODO: get queue information ????

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

// TODO: get minfied version of this file
router.get('/queues', function(req, res, next){
  var file = 'formatQueues.json'
  loadJsonFile(file).then( data =>{
    res.json(data)
  }).catch(err => console.log(err))
})

router.get('/apiVersion/:region', function(req, res){
  let url = `https://${req.params.region}.api.riotgames.com/lol/static-data/v3/versions`
  console.log(url);
  axios.get(url, { headers: apiKey })
    .then(function(response){
      res.json(response.data[0])
    })
})

// TODO: get minified version of this file
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
  // TODO: handle names that dont exist
  // TODO i think some games return more than just friends
  let reqUrl = `https://${req.params.region}.${baseUrl}`
  axios.get(
    `${reqUrl}/summoner/v3/summoners/by-name/${req.params.name}`,
    { headers: apiKey })
    .then(function(response){
      console.log(response.data)
      console.log(response);
      console.log(response.headers);
      res.json(response.data);
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
      console.log("basic list of matches")
      // console.log(matchList);
      let promises = [] //this will hold all requests as promises to be run concurrently
      matchList.map(match => { //for each match, get a full match details
        let url = `https://${region}.${baseUrl}/match/v3/matches/${match.gameId}`;
        promises.push(axios.get(url, {headers: apiKey}));
      })
      return Promise.all(promises)
        .then(function(allPromiseValues){
          console.log("Promises[] resolved. Promise values:");
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

      let matches = promisedVal.map(singleMatchData => {
        // console.log(singlePromise.headers)

        return singleMatchData.data;
      })
      // res.json(matches)

      // TODO: figure out which team main player is on
      let commonTeamMatesMap = new Map();

      let teamMates = {};
      let playerIdentities = {}
      let mainUser = {}
      let finalMatches = matches.map(match => {
        // TODO: is it faster to find the team, user index first?

        let identities = match.participantIdentities;
        let participants = match.participants;
        let matchInformation = {};
        // let playerArray = [];
        let teamMatesInMatch = {}
        let mainUserIndex;
        // let team = -1;

        let mainUserIdentity =  identities.filter(playerIdentity => {
          let currentId = playerIdentity.player.accountId                    
          return playerIdentity['player']['accountId'] == mainID
        })

        let team = mainUserIdentity[0].participantId < 6 ? 0 : 1;
        // console.log(mainUserIdentity[0].player.participantId);
        let teamIndex = team*5; //either 5 or 0
        let participantsSlice = participants.slice(teamIndex, 5+teamIndex)
        let identitiesSlice = identities.slice(teamIndex, 5+teamIndex)

        //entries creates an iterator for the participants array
        let participantsIterator = participantsSlice.entries();

        //iterate through each player identity
        for(const [index, onePlayer] of identitiesSlice.entries()){

          //if you are on blue team (team 100 is 0) (team 200 is 1)
          // if(team !== 1 && index === 5) break;

          //if you are on the second team, clear previous stuff you had for team members
          // if(index === 5 && team ===1){
          //   teamMatesInMatch = {}
          //   commonTeamMatesMap.clear()
          // }
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
          // TODO: optimize counting frequency of players
          // TODO: use separate structure to count frequency of recurring enemies
          let commonTeamMate = {
            name: onePlayer.player.summonerName,
            icon: onePlayer.player.profileIcon,
            id: currentId,
            count: 1
          }
          if(commonTeamMatesMap.has(currentId)){
            commonTeamMate.count = commonTeamMatesMap.get(currentId).count + 1
            commonTeamMatesMap.set(currentId, commonTeamMate)
          } else {
            commonTeamMatesMap.set(currentId, commonTeamMate)
          }
          playerObj.playerIndex = onePlayer.participantId
          playerObj.sumName = onePlayer.player.summonerName;
          playerObj.sumId = currentId;
          playerObj.icon = onePlayer.player.profileIcon;

          //all the properties from participants
          playerObj.championId = participant.championId;
          playerObj.stats = participant.stats;
          playerObj.lane = participant.timeline.lane;

          teamMatesInMatch[currentId] = playerObj
        }
        // TODO: slice the teamMatesInMatch so that only team mates are sent
        // QUESTION: what is difference between players and playersObj
        // TODO: in stats object, only send what we use
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

      commonTeamMatesMap.forEach(function(val, key){
        if(val.count < 2 || key == mainID)
          // console.log(key + " "+ val);
          commonTeamMatesMap.delete(key);
      });

      let commonPlayers = []
      // TODO: can this part be changed so we dont use Map and Array to figure out
      //frequent team mates??
      commonTeamMatesMap.forEach(function(val, key){
        commonPlayers.push(commonTeamMatesMap.get(key));
      })
      // res.json(matches);
      let toReturn = {
        matches:finalMatches,
        commonPlayers: commonPlayers,
        mainUser: mainUser
      }
      // let commonPlayers = JSON.stringify([...commonTeamMatesMap])
      console.log(commonPlayers);
      res.json(toReturn);
    })
    .catch(function(error){
      console.log("there was an error");
      console.log(error);
      res.send(error)
    })
})

// router.get('/champion/:id', function(req, res, next){
//   axios.get(`${baseUrl}/static-data/v3/champions/${req.params.id}`, {headers: apiKey})
//     .then(function (response) {
//       res.send(response.data)
//     })
//     .catch(function(error){
//       console.log("unable to get champ")
//       console.log(error.response);
//     })
// });

module.exports = router;
