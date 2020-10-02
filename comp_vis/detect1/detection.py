# Partly based on
# https://github.com/trek-view/pii-blur
# Please see the readme in that repo for how to obtain the model.

import os
import cv2
from imageai.Detection import ObjectDetection
import face_recognition

class Detector:
    def __init__(self, prob, run):
        self.prob = prob
        self.run = run

        if run[:3] == "iai":
            self.detector = ObjectDetection()
            self.detector.setModelTypeAsRetinaNet()
            self.detector.setModelPath(os.path.join(os.getcwd(), 'pii-blur/models/resnet50_coco_best_v2.0.1.h5'))
            self.detector.loadModel()
        self.sensitives = ("person", "car", "truck")

    def detect(self, id):
        inputfile = f'/home/www-data/panos/{id}.jpg'
        outputfile = f'panos//not_ok/{self.run}/{self.prob}_{id}.jpg'
        if self.run[:3] == "iai":
            print("Using ImageAI/COCO/Resnet")
            nsensitives = 0
            print (f"Pano {id}:")
            detections = self.detector.detectObjectsFromImage(input_image=inputfile,output_image_path=f'wrkdir/{self.prob}_{id}.jpg', minimum_percentage_probability=self.prob)
            rects = []
            for detection in detections:
                print(f"Found a {detection['name']}")
                if detection["name"] in self.sensitives:
                    nsensitives = nsensitives + 1 
                    rects.append(detection["box_points"])
            print (f"There are {nsensitives} sensitive objects here.")    
            if nsensitives == 0:
                pass
            else:
                image = cv2.imread(inputfile)
                for rect in rects:    
                    image = cv2.rectangle(image, (rect[0], rect[1]), (rect[2], rect[3]), (0,0,255), 5)
                cv2.imwrite(outputfile, image)
        elif self.run[:3] == 'fre':
            print(f"Using face_recognition with {inputfile}")
            img = face_recognition.load_image_file(inputfile)
            face_locations = face_recognition.face_locations(img)
            print(f"Found {len(face_locations)} faces in image {id}.")
