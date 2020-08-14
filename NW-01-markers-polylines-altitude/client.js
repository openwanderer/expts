const NearbyPanoMgr = require('./NearbyPanoMgr');
const PhotoSphereViewer = require('photo-sphere-viewer');
const MarkersPlugin = require('photo-sphere-viewer/dist/plugins/markers');
const GoogleProjection = require('jsfreemaplib').GoogleProjection;
const SphericalCoordCalc = require('./spherical');

class Client {

    constructor(options) {
        options = options || { };
        options.api = options.api || { };
        this.viewer = new PhotoSphereViewer.Viewer({
            container: document.querySelector(options.container || '#viewer'),
            plugins: [
                MarkersPlugin
            ]
        });
        this.panoNetworkMgr = new NearbyPanoMgr({
            jsonApi: options.api.geojson,
            nearbyApi: options.api.nearby
        });
        this.lat = 0.0;
        this.lon = 0.0;
        this.eventHandlers = {};
        this.resizePano = options.resizePano;
        this.api = { };
        this.api.nearest = options.api.nearest || 'op/panorama/nearest/{lon}/{lat}'; 
        this.api.byId = options.api.byId || 'op/panorama/{id}';
        this.api.panoImg = options.api.panoImg || 'op/panorama/{id}.jpg';
        this.api.panoImgResized = options.api.panoImgResized || 'op/panorama/{id}.w{width}.jpg';
        this.nearbys = { };
        this.panoMetadata = { };
        this.markersPlugin = this.viewer.getPlugin(MarkersPlugin);
        this.markersPlugin.on("select-marker", async (e, marker, data) => {
            let id;
            switch(marker.data.type) {
                case 'path':
                    id = parseInt(marker.id.split('-')[2]);
                    break;
                case 'pano':
                    id = parseInt(marker.id.split('-')[2]);
                    break;
            }
            if(id !== undefined) await this.loadPanorama(id);
        });
        this.arrowImage = options.arrowImage || 'images/arrow.png';
        this.curPanoId = 0;
        this.foundMarkerIds = [];
        this.sphMerc = new GoogleProjection();
        this.sphericalCoordCalc = new SphericalCoordCalc();
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


        this.viewer.setPanorama(
            this.resizePano === undefined ? 
                this.api.panoImg.replace('{id}', id) : 
                this.api.panoImgResized
                    .replace('{id}', id)
                    .replace('{width}', this.resizePano), {
            sphereCorrection: { 
                pan: -this.panoMetadata[id].poseheadingdegrees * Math.PI / 180.0
            } 
        }).then( () => { 
            this._loadMarkers(id);
        });
    }

    async _loadMarkers(id) {    
        this.markersPlugin.clearMarkers();
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
         this.sphericalCoordCalc.setValues({
            lat: this.panoMetadata[id].lat,
            lon: this.panoMetadata[id].lon,
            bearing: this.panoMetadata[id].poseheadingdegrees,
            elev: this.panoMetadata[id].altitude + 1.5
        });
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
            this.markersPlugin.addMarker({
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
            this.markersPlugin.showMarker(nearby.key);
        });
    }

    _hideMarkers(id) {
        this.panoMetadata[id].nearbys.forEach(nearby => {
            this.markersPlugin.hideMarker(nearby.key);
        });
    }

    _removeMarkers(id) {
        this.panoMetadata[id].nearbys.forEach(nearby => {
            this.markersPlugin.removeMarker(nearby.key);
        });
    }

    _createPanoMarkers(id) {
        const sphericalCoords = this.sphericalCoordCalc.calcSphericalCoords(this.panoMetadata[id].allNearbys);
        let scale;
        sphericalCoords.yawPitchDist.forEach ( (yp,i) => {
            scale = 10 * (1/yp[2]);
            this.markersPlugin.addMarker({
                id: `pano-${this.curPanoId}-${this.panoMetadata[id].allNearbys[i][3]}`,
                tooltip: `pano ${this.panoMetadata[id].allNearbys[i][3]}`,
                data: {
                    type: 'pano'
                },
                latitude: yp[1], 
                longitude: yp[0], 
  
                   // the rest ripped/modified from Eesger's example
                  // source path: https://commons.wikimedia.org/wiki/File:Map_marker.svg
                  path       : 'M182.9,551.7c0,0.1,0.2,0.3,0.2,0.3S358.3,283,358.3,194.6c0-130.1-88.8-186.7-175.4-186.9 C96.3,7.9,7.5,64.5,7.5,194.6c0,88.4,175.3,357.4,175.3,357.4S182.9,551.7,182.9,551.7z M122.2,187.2c0-33.6,27.2-60.8,60.8-60.8 c33.6,0,60.8,27.2,60.8,60.8S216.5,248,182.9,248C149.4,248,122.2,220.8,122.2,187.2z',
                  svgStyle   : {
                    fill       : 'rgba(255, 255, 0, 0.3)',
                    stroke     : 'rgb(255, 255, 0)',
                    strokeWidth: '2px'
                  },
                  anchor     : '52% 102%',
                  scale      : [scale, scale] // [b[6]*(window.clientHeight/1000)*0.5, b[6]*(window.clientHeight/1000)*1.5]
            });
        });
    }

    _createPaths(id) {
        this.panoMetadata[id].nearbys.forEach ( nearby => {
            nearby.key = `path-${id}-${nearby.id}`;
            let yaw = nearby.bearing;
            const sphericalCoords = this.sphericalCoordCalc.calcSphericalCoords(nearby.path, 1);
            this.markersPlugin.addMarker({
                id: nearby.key, 
                data: {
                    type: 'path'
                },
                polylineRad: sphericalCoords.path,
                svgStyle: {
                    fill: 'rgba(255, 255, 0, 0.5)',
                    stroke: 'rgba(255, 255, 0, 1.0)'
                },
                tooltip: `to pano ${nearby.id}`
            });
        });
    }
}

module.exports = {
    Client: Client
};
