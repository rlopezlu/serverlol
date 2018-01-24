var express = require('express');
var router = express.Router();
var axios = require('axios');
require('dotenv').config();


const apiKey = {'X-Riot-Token' : process.env.API_KEY};
const accountId = 50308642;
const baseUrl = 'https://na1.api.riotgames.com/lol';

router.get('/', function(req, res, next){
  res.send('welcome to this page lol')
})

/* GET home page. */
router.get('/sumNameId/:name', function(req, res, next) {
  //get funciton returns a promise
  //then takes in a promise and a callback that handles the reponse of that promise
  //catch is used if fails
  axios.get(
    // `https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/${req.params.name}?api_key=RGAPI-1c906d75-696b-46f2-b046-1870f69cb995`
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

router.get('/matchListPromise/', function(req, res, next){
  const url = `${baseUrl}/match/v3/matchlists/by-account/${accountId}`;
  let playersInGame = [];

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
    console.log("received all promice val finally");
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

module.exports = router;
