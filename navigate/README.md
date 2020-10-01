# Navigation experiment

This is an experiment to implement navigation using markers and polylines in 3D, with each feature positioned at its correct real-world latitude, longitude and
altitude. It is based on [the OpenPanos client](https://github.com/nickw1/openpanos/tree/master/openpanos-client/src) and is likely to supersede it.

Like the OpenPanos client, you specify a series of API endpoints for your data. However, panos are now rendered in their correct world position in 3D, using the OpenWanderer `jsapi`. Now, OSM ways in the vicinity of the pano are also shown. Future intention is to be able to click these to navigate to the nearest pano along that way.
