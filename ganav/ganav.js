/******************************************************************************/
/*             Code originally created by:                                    */
/*            Eesger Toering / knoop.frl / Project GEO Archive                */
/*      Modified (WIP) to fit with the remaining OpenWanderer jslib code      */
/*                 Some parts have been removed for now                       */
/******************************************************************************/

const coordtrans = require('./coordtrans');

class GANav {
    constructor(nav) {
        this.nav = nav;

        // Modify to attempt to dynamically create the svg.
        // Dynamically creating the svg does not lead to the desired effect.
        // It is added to the DOM (innerHTML is supposed to now work on SVG)
        // but does not appear to be activated.
        const svg = document.createElement('svg');
        svg.setAttribute('height', 1);
        svg.setAttribute('width', 1);
        svg.style.position = 'absolute';
        svg.style.top = '-1px';
        svg.style.left = '-1px';
        svg.innerHTML = '<defs><radialGradient id="GAgradient1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"> <stop offset="0%" stop-color="rgba(255, 255, 255, 1.0)"/><stop offset="25%"  stop-color="rgba(255, 255, 255, 1.0)"/><stop offset="100%" stop-color="rgba(255, 255, 255, 0.4)"/></radialGradient></defs>';
//        document.body.appendChild(svg);

        this.gaVars = {
            baseHeight: 3.0,
            flattener: 0.8,
            degDown: 1.0,
            pathWidth: 20,
            markerBaseFill: 'rgba(255, 255, 255, 0.4)'
        };
        

        this.nav.viewer.markersPlugin.on('select-marker', (e, marker, data) => {
            const pos = {
                x: e.offsetX,
                y: e.offsetY
            };

            const b = this.nav.viewer.psv.getPosition();
            this.goTo(marker.id.split('-')[2]);
        });

        this.nav.viewer.markersPlugin.on('over-marker', (e, marker) => {
              this.markerOver(marker.id);
        });

        // on 'leave marker' undo highlight of that marker
        this.nav.viewer.markersPlugin.on('leave-marker', (e, marker) => {
              this.markerLeave(marker.id);
        });

//        this.nav.viewer.markersPlugin.on('mousemove', this.onMouseMove.bind(this));
    }

    // Original code by Eesger Toering ;  modified to fit in
    // with the navigator code
    createPaths(id) {
        let polyPath = [ 0, [] ];
        let i, b;
        let panoid=0, panoidx;
        for(i=0; i<this.nav.panoMetadata[id].sequence.panos.length; i++) {
            if(this.nav.panoMetadata[id].sequence.panos.length == 1) continue;
            const pano = this.nav.panoMetadata[id].sequence.panos[i];
            const latDelta = Math.abs(this.nav.panoMetadata[id].lat - pano.lat);
            if(latDelta * 111 * 1000 > 200) {
                polyPath = [polyPath[0] + 1, [] ];
                continue;
            }
            // skip lon next..
            const lonDelta = Math.abs(this.nav.panoMetadata[id].lon - pano.lon);
            if(lonDelta * Math.pow(290-(105+pano.lon), 1.065) * 1000 > 200) {
                polyPath = [polyPath[0] + 1, [] ];
                continue;
            }
            // reposition the spot directly below.. a minimum distance is 
            // needed because directly below (-.5*PI) there is no impact of yaw!
            if(id == pano.panoid) {
                panoidx = i;
                const theOtherOne = (i==0) ? 
                    this.nav.panoMetadata[id].sequence.panos[1] : 
                    this.nav.panoMetadata[id].sequence.panos[i-1] ; 
                // Not sure what distance1 and distance2 are used for or whether they are even needed
                // if removed the line does not cover the current pano
                let distance1 = coordtrans.distance(
                    this.nav.panoMetadata[id].lat,
                    this.nav.panoMetadata[id].lon,
                    theOtherOne.lat,
                    theOtherOne.lon
                );
                // Half 1/distance
                const distance2 = (distance1 < 0.7) ? 0.9 : 0.5/distance1;
                distance1 = 1 - distance2;

                b = coordtrans.geodeticToEnu(
                   theOtherOne.lat * distance2 + pano.lat * distance1,
                    theOtherOne.lon * distance2 + pano.lon * distance1,
                    0,
                    this.nav.panoMetadata[id].lat,
                    this.nav.panoMetadata[id].lon,
                    this.gaVars.baseHeight * 0.9
                );
				console.log(`${i} ${id} theotherone ${theOtherOne.panoid}`);
                panoid=theOtherOne.panoid;
            } else {
                b = coordtrans.geodeticToEnu(
                    pano.lat,
                    pano.lon,
                    pano.ele * this.gaVars.flattener,
                    this.nav.panoMetadata[id].lat,
                    this.nav.panoMetadata[id].lon,
                    this.nav.panoMetadata[id].ele * this.gaVars.flattener + this.gaVars.baseHeight
                );
				console.log(`${i} ${id}  ${this.nav.panoMetadata[id].sequence.panos[i].panoid}`);
                panoid = this.nav.panoMetadata[id].sequence.panos[i].panoid;
            }    

            // into the ground by X degrees
            b[3] = Math.sqrt(b[0]*b[0] + b[1]*b[1]);
            b[2] -= Math.sin ( this.gaVars.degDown * Math.PI/180) * b[3];
               // b[3] = distance | b[4] = radians Pitch (-.5pi - 0.5pi)
            // b[5] = radians Yaw (0 - 2pi)
            b = coordtrans.enuPlusMarkerdata(b, this.nav.viewer.heading);

            // b[6] = marker scale (result formula is via trial and error ;)
            b[6] =  (300/(b[3]>300 ? 300:b[3]))*(4/100)+0.03;


              // create polyline to show the path of the images!
            if ( i <  this.nav.imageNow || (i == this.nav.imageNow && i != 0) ) {
                polyPath[1].push([b[5]-b[6]/this.gaVars.pathWidth, b[4] ]); 
                polyPath[1].unshift([Math.round((b[5]+b[6]/this.gaVars.pathWidth)*1000)/1000, b[4] ]);
            } else {
                polyPath[1].push([Math.round((b[5]+b[6]/this.gaVars.pathWidth)*1000)/1000, b[4] ]);
                polyPath[1].unshift([b[5]-b[6]/this.gaVars.pathWidth, b[4] ]);
            }
            // in an earlier version the path was created for every 100 images 
            //or when the distance was over 100 meters
            // now it is only a polyline of one image to the next, 
            // so that a circle gradient can be placed on the mouse over, 
            // for a cooler effect ;)
            if (polyPath[1].length > 2 ) {
				console.log(`path-${id}-${panoid}`);
            	this.nav.viewer.markersPlugin.addMarker({
                  id        : `path-${id}-${panoid}`,
                  //content   : 'This mountain is so great it has dots on it!',
                        tooltip: `Pano ${panoid}`,
                  polylineRad: polyPath[1],
                  svgStyle  : {
                    fill       : this.gaVars.markerBaseFill, 
                    stroke     : this.gaVars.markerBaseFill.replace(/([0-9.]+)\)/, function (x,y) {
                       return parseFloat(y)/4+')';
                     }),
                strokeWidth: '1px',//'0.1em',
                  },
            	});
    			polyPath= [polyPath[0]+1,
                   [polyPath[1][ 0 ],
                    polyPath[1][ polyPath[1].length-1 ]]
                  ];

			}
        }
  		// always draw the last polyline.. you might end up not to in the for loop
  		if (polyPath[1].length > 1 && !this.nav.viewer.markersPlugin.markers[`polygon${panoid}`] ) {
				console.log(`**path-${id}-${panoid}`);
    		this.nav.viewer.markersPlugin.addMarker({
      			id        : `path-${id}-${panoid}`, 
                        tooltip: `Pano ${panoid}`,
      		//content   : 'This mountain is so great it has dots on it!',
      		polylineRad: polyPath[1],
      		svgStyle  : {
        		fill       : this.gaVars.markerBaseFill, //'url(#GAgradient0)',//'rgba(255, 255, 255, 0.3)', //'rgba(255,0,0,0.3)',
        		stroke     : this.gaVars.markerBaseFill.replace(/([0-9.]+)\)/, function (x,y) {
                       return parseFloat(y)/4+')';
                     }),
        		strokeWidth: '1px',//'0.1em',
      		},
    		});
    		polyPath= [[],[]];
  		}
    }

    markerOver(markerID) {
          if (!this.nav.viewer.markersPlugin.markers[ markerID ]
               ||  this.nav.viewer.markersPlugin.markers[ markerID ].type == 'image'
               || !this.nav.viewer.markersPlugin.markers[ markerID ].config.svgStyle
               || !this.nav.viewer.markersPlugin.markers[ markerID ].config.svgStyle.fill) { 
            return; 
        }

          if ((typeof(this.gaVars.markerBaseFill) == 'undefined')) {
            this.gaVars.markerBaseFill = this.nav.viewer.markersPlugin.markers[ markerID ].config.svgStyle.fill;
          }
          let fillNew = 'url(#GAgradient1)';

  
          this.nav.viewer.markersPlugin.updateMarker({
            id   : markerID,
            svgStyle : {
                  fill       : fillNew,//'rgba(77, 239, 71, 0.6)',
                  stroke     : this.gaVars.markerBaseFill.replace(/([0-9.]+)\)/, function (x,y) {
                     return parseFloat(y)/4+')';
                   }),
              strokeWidth: '1px',//'0.1em',
            },
          });
    }

    markerLeave(markerID) {  //console.log('leave', marker.id);
          if (!this.nav.viewer.markersPlugin.markers[ markerID ]
               ||  this.nav.viewer.markersPlugin.markers[ markerID ].type == 'image'
               || !this.nav.viewer.markersPlugin.markers[ markerID ].config.svgStyle
               || !this.nav.viewer.markersPlugin.markers[ markerID ].config.svgStyle.fill) { 
            return; 
        }
  
          let fillNew = this.gaVars.markerBaseFill;


          this.nav.viewer.markersPlugin.updateMarker({
            id   : markerID,
            svgStyle : {
                  fill       : fillNew,
            },
          });
    }

    goTo(id) {
        // TODO go to the id - for now just load the pano direct
        this.nav.viewer.markersPlugin.clearMarkers();
        this.nav.loadPanorama(id);
    }
}

module.exports = GANav;
