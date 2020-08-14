const expt = require('./client');
const qs = require('querystring');

const parts = window.location.href.split('?');
const get = qs.parse(parts[1]);

const client = new expt.Client();
if(get.id) {
    client.loadPanorama(get.id);
} else if (get.lat && get.lon) {
    client.findPanoramaByLonLat(get.lon, get.lat);
} else {
    client.loadPanorama(1);
}

