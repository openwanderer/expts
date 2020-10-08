const jsfreemaplib = require('jsfreemaplib');
const PathFinder = require('./geojson-path-finder'); 
const BoundingBox = jsfreemaplib.BoundingBox;
const JunctionManager = require('./JunctionManager');
const turfPoint = require('turf-point');
const turfBearing = require('@turf/bearing').default;
const NetworkMgr = require('./networkmgr');
const DemTiler = require('jsfreemaplib/demtiler'); 
const DEM = jsfreemaplib.DEM; 

class NearbyPanoMgr {

    constructor(options) {
        this.options = options || { };
        this.options.jsonApi = this.options.jsonApi || 'op/map/highways';
        this.options.nearbyApi = this.options.nearbyApi || 'op/panorama/{id}/nearby';
        this.networkMgr = new NetworkMgr({
            distThreshold : 0.005
        });
        this.tiler = new DemTiler('/terrarium/{z}/{x}/{y}.png');
        this.sphMerc = new jsfreemaplib.GoogleProjection();
    }

    // 'json' is the current panorama
    async doLoadNearbys (json) {
         const pois = [];
         json.lon = parseFloat(json.lon);
         json.lat = parseFloat(json.lat);
         json.poseheadingdegrees = parseFloat(json.poseheadingdegrees);

         const sphMercPos = this.sphMerc.project(json.lon, json.lat);
        
         const dem = await this.tiler.getData(sphMercPos);
         const altitude = dem.getHeight(sphMercPos[0], sphMercPos[1]); 
         const nearbys = await fetch(this.options.nearbyApi.replace('{id}',json.id)).then(resp => resp.json());
         const geojson = await fetch(`${this.options.jsonApi}?bbox=${nearbys.bbox.join(",")}`).then(resp => resp.json());
         pois.push(json);
         for(const nearby of nearbys.panos) {
            nearby.lon = parseFloat(nearby.lon);
            nearby.lat = parseFloat(nearby.lat);
            const panoSphMerc = this.sphMerc.project(nearby.lon, nearby.lat);
            const panoDem = await this.tiler.getData(panoSphMerc);
            nearby.altitude = panoDem.getHeight(panoSphMerc[0], panoSphMerc[1]);
            nearby.poseheadingdegrees = parseFloat(nearby.poseheadingdegrees);
            pois.push(nearby);
        } 
        this.networkMgr.update(geojson, pois);
        const groupedRoutes = this.networkMgr.route (
            [json.lon, json.lat], 
            pois.filter( pano => pano.id != json.id), {
                snapToJunction: true
            }
        );
        // groupedRoutes is an array of arrays; outer array represents each
        // bearing then inner array is each route starting at that bearing
        // has been sorted so the first member of the inner array will be
        // the nearest panorama along that route
        const adjacents = groupedRoutes.map ( groupForBearing => groupForBearing[0] );
        // Add altitudes to all paths to adjacents
        for(const adjacent of adjacents) {
            for(const pt of adjacent.path) {
                const routeSphMerc = this.sphMerc.project(pt[0], pt[1]);
                const routeDem = await this.tiler.getData(routeSphMerc);
                pt[2] = routeDem.getHeight(routeSphMerc[0], routeSphMerc[1]);
            }
        }

        return  {
            nearbys: nearbys.panos, // ALL panos (e.g. to render them)
            adjacents: adjacents, // the adjacents only
            altitude: altitude // altitude of THIS pano, use to set scene altitude
         };
   }    
}
module.exports = NearbyPanoMgr;
