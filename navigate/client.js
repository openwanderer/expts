const NearbyPanoMgr = require('./NearbyPanoMgr');
const GoogleProjection = require('jsfreemaplib').GoogleProjection;
const OpenWanderer = require('../../jsapi');

class Client {

    constructor(options) {
        options = options || { };
        options.api = options.api || { };
        this.viewer = new OpenWanderer.Viewer(options.element || '#pano');
        this.panoNetworkMgr = new NearbyPanoMgr({
            jsonApi: options.api.geojson,
            nearbyApi: options.api.nearby
        });
        this.lat = 0.0;
        this.lon = 0.0;
        this.eventHandlers = {};
        this.resizePano = options.resizePano;
        this.api = { };
        this.api.nearest = options.api.nearest;
        this.api.byId = options.api.byId;  
        this.api.panoImg = options.api.panoImg; 
        this.api.panoImgResized = options.api.panoImgResized; 
        this.nearbys = { };
        this.panoMetadata = { };
        this.viewer.markersPlugin.on("select-marker", async (e, marker, data) => {
            let id;
            switch(marker.data.type) {
                case 'path':
                    id = parseInt(marker.id.split('-')[2]);
                    break;
                case 'marker':
                    id = parseInt(marker.id.split('-')[1]);
                    break;
            }
            if(id !== undefined) await this.loadPanorama(id);
        });
        this.arrowImage = options.arrowImage || 'images/arrow.png';
        this.curPanoId = 0;
        this.foundMarkerIds = [];
        this.sphMerc = new GoogleProjection();
    }


    async findPanoramaByLonLat(lon,lat) {
        const json = await fetch(this.api.nearest
                .replace('{lon}', lon)
                .replace('{lat}', lat))
                .then(resp=>resp.json());
        await this.loadPanorama(json.id);
    }

    async loadPanorama(id) {
        if(this.panoMetadata[this.curPanoId] && this.panoMetadata[this.curPanoId].nearbys) {
//            this._hideMarkers(this.curPanoId);
        }

        if(!this.panoMetadata[id]) {
             await this._loadPanoMetadata(id);
        } 


        const heading = this.panoMetadata[id].poseheadingdegrees > 180 ? this.panoMetadata[id].poseheadingdegrees - 360 : this.panoMetadata[id].poseheadingdegrees;
        this.viewer.setHeading(heading);
        this.viewer.setPanorama(
            this.resizePano === undefined ? 
                this.api.panoImg.replace('{id}', id) : 
                this.api.panoImgResized
                    .replace('{id}', id)
                    .replace('{width}', this.resizePano)
        ).then( () => { 
            this._loadMarkers(id);
        });
    }

    async _loadMarkers(id) {    
        this.viewer.markersPlugin.clearMarkers();
        if(!this.panoMetadata[id].nearbys) {
            const routes = await this.panoNetworkMgr.doLoadNearbys(
                this.panoMetadata[id]
            );
            this._onFoundNearbys(id, routes);
        } else {
              this._createMarkers(id);
        }
    }

    async update(id, properties) {
        if(this.panoMetadata[id]) {
            if(properties.position) {
                this.panoMetadata[id].lon = properties.position[0];
                this.panoMetadata[id].lat = properties.position[1];
            } else if (properties.poseheadingdegrees) {
                this.panoMetadata[id].poseheadingdegrees = properties.poseheadingdegrees;
            }

            this._removeMarkers(id);
            this.panoMetadata[id].nearbys = null;

            if(this.curPanoId == id) {    
                await this.loadPanorama(id);
            }
        }
    }

    on(evName,evHandler) {
        this.eventHandlers[evName] = evHandler;
    }

    async _loadPanoMetadata(id) {
        this.panoMetadata[id] = await fetch(this.api.byId.replace('{id}', id))
                                .then(response => response.json());
        return this.panoMetadata[id];
    }

    _onFoundNearbys(origPanoId, routes) {
        this.panoMetadata[origPanoId].nearbys = routes.adjacents;
        this.panoMetadata[origPanoId].allNearbys = routes.nearbys.map ( nearby =>  [ nearby.lon, nearby.lat, nearby.altitude, nearby.id ] );

        this.panoMetadata[origPanoId].altitude = routes.altitude;
        this._createMarkers(origPanoId);
    }

    _createMarkers(id) { 
        this._setPanoId(id);
        this.viewer.setLonLat(this.panoMetadata[id].lon, this.panoMetadata[id].lat);
        this.viewer.setElevation(this.panoMetadata[id].altitude + 1.5);
        this._createPanoMarkers(id);
        this._createPaths(id);
    }

    _setPanoId(id) {
        this.curPanoId = id;

        if(this.eventHandlers.panoChanged) {
            this.eventHandlers.panoChanged(id);
        }

        if(this.eventHandlers.locationChanged) {
            this.eventHandlers.locationChanged(this.panoMetadata[id].lon, this.panoMetadata[id].lat);
        }
    }

    _createHotspots(id) {

        this.panoMetadata[id].nearbys.forEach ( nearby => {
            nearby.key = `${id}-${nearby.id}`;
            let yaw = nearby.bearing;
            this.viewer.markersPlugin.addMarker({
                id: nearby.key, 
                latitude: 5 * Math.PI / 180.0, 
                longitude: `${yaw}deg`,
                image: this.arrowImage,
                width: 64,
                height: 64,
                tooltip: `to pano ${nearby.id}`
            });
        });
    }

    _showMarkers(id) {
        this.panoMetadata[id].nearbys.forEach(nearby => {
            this.viewer.markersPlugin.showMarker(nearby.key);
        });
    }

    _hideMarkers(id) {
        this.panoMetadata[id].nearbys.forEach(nearby => {
            this.viewer.markersPlugin.hideMarker(nearby.key);
        });
    }

    _removeMarkers(id) {
        this.panoMetadata[id].nearbys.forEach(nearby => {
            this.viewer.markersPlugin.removeMarker(nearby.key);
        });
    }

    _createPanoMarkers(id) {
        this.panoMetadata[id].allNearbys.forEach ( nearby => {
            this.viewer.addMarker(nearby, { id : `marker-${nearby[3]}`, tooltip: `Location of pano ${nearby[3]}` } );
        });
    }

    _createPaths(id) {
        this.panoMetadata[id].nearbys.forEach ( nearby => {
            nearby.key = `path-${id}-${nearby.id}`;
            this.viewer.addPath(nearby.path, { tooltip: `to pano ${nearby.id}`, id: nearby.key });
        });
    }
}

module.exports = {
    Client: Client
};
