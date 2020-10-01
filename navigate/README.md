# Navigation experiment

This is an experiment to implement navigation using markers and polylines in 3D, with each feature positioned at its correct real-world latitude, longitude and
altitude. It is based on [the OpenPanos client](https://github.com/nickw1/openpanos/tree/master/openpanos-client/src) and is likely to supersede it.

Like the OpenPanos client, you specify a series of API endpoints for your data. However, panos are now rendered in their correct world position in 3D, using the OpenWanderer `jsapi`, as well as the path to each pano's location as a polyline. Furthermore you can navigate to an adjoining pano by clicking the path to it.
