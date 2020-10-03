import psycopg2
import sys
from anonymizer.detection import Detector, get_weights_path
from PIL import Image, ImageDraw, ImageFilter
import numpy
import os

def main(argv):
    results = find_unauthorised()
    if(len(results) == 0):
        print ("No Results")
    else:
        threshold = 0.3 
        if(len(argv) > 0):
            threshold = float(argv[0])
        ids = []
        for result in results:
            ids.append(result[0])
        detect(ids, threshold)
                

def find_unauthorised(startid=9686, endid=10000):
    conn = psycopg2.connect('dbname=gis user=gis')
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM panoramas WHERE authorised=0 AND id BETWEEN {startid} AND {endid} ORDER BY id")
    results = cur.fetchall()
    return results

def detect(ids, threshold=0.3, weights_path="./weights",panos_path="/home/www-data/panos", output_path="./panosout"):
    print(threshold)
    detectors = {
        'face': Detector(kind='face', weights_path=get_weights_path(weights_path, kind='face')),
        'plate': Detector(kind='face', weights_path=get_weights_path(weights_path, kind='plate'))
    }
    detection_thresholds = {
        'face': threshold,
        'plate': threshold
    }

    if not os.path.exists(f"{output_path}/{threshold}"):
        os.makedirs(f"{output_path}/{threshold}")

    for id in ids:
        print(f"Loading {panos_path}/{id}.jpg")
        with Image.open(f"{panos_path}/{id}.jpg") as image:
            npimage = numpy.array(image.convert('RGB'))
            detected_boxes = []
            for kind,detector in detectors.items():
                new_boxes = detector.detect(npimage, detection_thresholds[kind])
                detected_boxes.extend(new_boxes)
            
            draw = ImageDraw.Draw(image) 

            for box in detected_boxes:
                print(f"{box.x_min} {box.y_min} {box.x_max} {box.y_max} {box.score} {box.kind}")
    #            draw.rectangle([box.x_min, box.y_min, box.x_max, box.y_max],outline=(255, 0, 0), width=5)

                cropbox = (int(box.x_min), int(box.y_min), int(box.x_max), int(box.y_max))
                crop = image.crop(cropbox)
                for i in range(10):
                    crop = crop.filter(ImageFilter.BLUR)
                image.paste(crop, cropbox)


            image.save(f"{output_path}/{threshold}/{id}.jpg", "JPEG")

if __name__ == "__main__":
    main(sys.argv[1:])
