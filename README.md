# LoL Match History proxy

Match data powered by Riot Games [API](https://developer.riotgames.com/)  
Created with [express-generator](https://www.npmjs.com/package/express-generator)  
[Axios](https://www.npmjs.com/package/axios) was used for http requests due to its usage of Promises  

To setup
```
$ git clone
$ npm install
```
Navigate to project root and create a .env file with your Riot games api key.  
Never add your key to git, github or other forms of version control.
```
API_KEY=RGAPI-X-X-X-X-X
```
Then run the server  
```
$ npm start
```

Check out the React.js project [here](https://github.com/rlopezlu/reactlol/blob/master/README.md)

TODO   
Cache responses so that data is not requested again for users who come back to site
