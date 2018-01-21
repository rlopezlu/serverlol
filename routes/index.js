var express = require('express');
var router = express.Router();
var axios = require('axios');
require('dotenv').config();


const apiKey = {'X-Riot-Token' : process.env.API_KEY};

/* GET home page. */
router.get('/sumNameId/:name', function(req, res, next) {
  axios.get(
    // `https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/${req.params.name}?api_key=RGAPI-1c906d75-696b-46f2-b046-1870f69cb995`
    `https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/${req.params.name}`,
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
  const url = 'https://na1.api.riotgames.com/lol/match/v3/matchlists/by-account/50308642'
  axios.get(url, {
    headers: apiKey
  })
  .then(function(response){
    console.log(response.data);
    res.send(response.data);
  }).catch(function(error){
    console.log(error);
  })
});

router.get('/expandedMatchList/', function(req, res, next){
  const baseUrl = 'https://na1.api.riotgames.com/lol/';
  const url = baseUrl + 'match/v3/matchlists/by-account/50308642';
  let playersInGame = [];
  axios.get(url, {headers: apiKey})
  .then(function(response){ //this function returns a promise
    let copy = response.data.matches
      .slice(0,4)//first 4 elements of the array
      .map(x => (
        {
          gameId: x.gameId,
          champion: x.champion,
          lane: x.lane
        }));
    console.log(copy)
    copy.map(x => {
      console.log(x.gameId);
      axios.get(`https://na1.api.riotgames.com/lol/match/v3/matches/${x.gameId}`,
        {headers: apiKey}
      )
      .then(function(response){
        playersInGame = response.data.participantIdentities.map(x => (
          {
            name: x.player.summonerName,
            // x.championId,
            id: x.participantId,
          }));
          console.log(playersInGame);
      })
      .catch(function(error){
        console.log("there was an error " );
      })
    });
    // res.send(playersInGame);
  })
  .then(function(){
    res.send(playersInGame)
  })
  .catch(function(error){
    console.log(error);
  })
});
module.exports = router;
