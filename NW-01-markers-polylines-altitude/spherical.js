const coordtrans = require('./coordtrans');

class SphericalCoordCalc {

    constructor() {
        this.curLon = 181;
        this.curLat = 91;
        this.curBearing = 0;
        this.curElev = 0;
    }

    setValues(options) {
        this.curLon = options.lon;
        this.curLat = options.lat;
        this.curBearing = options.bearing;
        this.curElev = options.elev || 0;
    }

    // Input : an array of lon/lat/(optional elevation) points plus flag
    // for whether to create path
    // Returns: an array of yaw/pitch/distance values for each marker and
    // optionally for a polygonal path of a given width defined by the 
    // input points (if path width is defined, it will create a path)
    calcSphericalCoords(points, pathWidth) {
        const values = {
            yawPitchDist: [],
            path: []
        };

        const projectedCoords = [];
        points.forEach ( point => {
            let b = coordtrans.geodeticToEnu(point[1], point[0], point[2] === undefined ? -1.5: point[2], this.curLat, this.curLon, this.curElev || 0);

            // push b to projected coords before doing anything else so we 
            // can later use for the polygon
            projectedCoords.push([b[0], b[1], b[2]]); 

            // b[0] = E b[1] = N b[2] = elev
            b = coordtrans.enuPlusMarkerdata(b, this.curBearing * Math.PI / 180.0); // I think the last argument is correct?  - seems to be
            // b[3] is simply the distance...

            values.yawPitchDist.push([b[5], b[4], b[3]]);
        });
        if(pathWidth) {
            values.path = this._createPath(projectedCoords, pathWidth);
        }
        return values;
    }

    // Input: a projected polyline (ENU)
    // Output: yaw/pitch of a polygon of the given with 
    _createPath(projectedCoords, width) {
        // ASSUMPTION projectedCoords[0] is easting, [1] is northing, [2] is elevation - seems to be the case...
        const path = [];
        const polyProj = this._createPathPolygon(projectedCoords, width);
        polyProj.forEach ( p => {
            // Because the polygon coords are in the correct reference frame, this should work...
            let b = coordtrans.geodeticToEnu(p[1], p[0], p[2] === undefined ? -1.5: p[2], this.curLat, this.curLon, this.curElev || 0);
             b = coordtrans.enuPlusMarkerdata(p, this.curBearing * Math.PI / 180.0);
            path.push([b[5], b[4]]);
        });
        return path;
    }

    // Input: an array of projected (metre) coordinates as a path
    // Returns: an array of projected (metre) coordinates of a particular width as a polygon
    _createPathPolygon(projectedPath, width=1) {
        const polygon = new Array(projectedPath.length * 2);
        let dx, dy, len, dxperp, dyperp, thisVtxProvisional, nextVtxProvisional;
        const k = projectedPath.length - 1;
        for(let i=0; i<k; i++) {
            dx = projectedPath[i+1][0] - projectedPath[i][0];
            dy = projectedPath[i+1][1] - projectedPath[i][1];
            len = Math.sqrt(dx*dx + dy*dy);
            dxperp = dy * (width/2) / len;
            dyperp = dx * (width/2) / len;
            thisVtxProvisional = [    
                projectedPath[i][0] - dxperp,
                projectedPath[i][1] + dyperp,
                projectedPath[i][2],
                projectedPath[i][0] + dxperp,
                projectedPath[i][1] - dyperp,
                projectedPath[i][2]
            ];
            if(i > 0) {
                thisVtxProvisional.forEach( (vtx,j) => {    
                    if(j<2) vtx = (vtx + nextVtxProvisional[j]) / 2;
                });
            }
            polygon[i] = [ thisVtxProvisional[0], thisVtxProvisional[1], thisVtxProvisional[2] ];
            polygon[polygon.length-i-1] = [ thisVtxProvisional[3], thisVtxProvisional[4], thisVtxProvisional[5] ];
            nextVtxProvisional = [    
                projectedPath[i+1][0] - dxperp,
                projectedPath[i+1][1] + dyperp,
                projectedPath[i+1][2],
                projectedPath[i+1][0] + dxperp,
                projectedPath[i+1][1] - dyperp,
                projectedPath[i+1][2]
            ];
        }
        
        polygon[k] = [ 
             projectedPath[k][0] - dxperp,
             projectedPath[k][1] + dyperp,
             projectedPath[k][2]
            
        ];
        polygon[k+1] = [ 
            projectedPath[k][0] + dxperp,
            projectedPath[k][1] - dyperp,
            projectedPath[k][2]
            
        ];
       
        return polygon;
    }
}

module.exports = SphericalCoordCalc;
