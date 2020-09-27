# Partly based on
# https://github.com/trek-view/pii-blur
# Please see the readme in that repo for how to obtain the model.

import psycopg2
import sys
import os
import shutil
from imageai.Detection import ObjectDetection

conn = psycopg2.connect('dbname=otv user=gisuser')

sensitives = ("car", "person", "truck")
cur = conn.cursor()
cur.execute("SELECT id FROM panoramas WHERE status=0 ORDER BY id")
results = cur.fetchall()
if(len(results) == 0):
	print ("No Results")
else:
	prob = 25
	if(len(sys.argv) > 1):
		prob = int(sys.argv[1])
	detector = ObjectDetection()
	detector.setModelTypeAsRetinaNet()
	detector.setModelPath(os.path.join(os.getcwd(), 'pii-blur/models/resnet50_coco_best_v2.0.1.h5'))
	detector.loadModel()
	for result in results:
		nsensitives = 0
		print (f"Pano {result[0]}:")
		inputfile = f'/var/www/html/panos/{result[0]}.jpg'
		detections = detector.detectObjectsFromImage(input_image=inputfile,output_image_path=f'/var/www/html/otv360/wrkdir/{prob}_{result[0]}.jpg', minimum_percentage_probability=prob)
		for eachObject in detections:
			print(f"Found a {eachObject['name']}")
			if eachObject["name"] in sensitives:
				nsensitives = nsensitives + 1 
		print (f"There are {nsensitives} sensitive objects here.")	
		if nsensitives == 0:
			shutil.copy(inputfile, "/var/www/html/panos/ok")
		else:
			shutil.copy(inputfile, "/var/www/html/panos/not_ok")
