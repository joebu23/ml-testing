const redis = require('redis');

var client;

async function getRedis() {
    client = redis.createClient({
        url: 'redis://192.168.86.32:6379'
      });

    await client.connect();
}

async function getAllIdentities() {
    var results = [];

    var keys = await client.keys('*');
    for (var i = 0; i < keys.length; i++) {
        const value = await client.get(keys[i]);
        results.push({
            id: keys[i],
            data: value
        });
    }

    return results;
}

async function saveValue(key, value) {
    client.set(key, value);
}

module.exports = { getRedis, getAllIdentities, saveValue };