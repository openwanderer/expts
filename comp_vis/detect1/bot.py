import psycopg2
import sys
import detection

conn = psycopg2.connect('dbname=gis user=gis')

run = "iaicoco"
sensitives = ("car", "person", "truck")
cur = conn.cursor()
cur.execute("SELECT id FROM panoramas WHERE authorised=0 AND id >= 9686 ORDER BY id")
results = cur.fetchall()
if(len(results) == 0):
    print ("No Results")
else:
    prob = 25
    if(len(sys.argv) > 1):
        prob = int(sys.argv[1])
    detector = detection.Detector(prob, run)
    for result in results:
        detector.detect(result[0])
