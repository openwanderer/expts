import psycopg2
import sys
import os
import blur_persons.blur_persons

def main(argv):
    results = find_unauthorised(argv[1], argv[2])
    if(len(results) == 0):
        print ("No Results")
    else:
        ids = [result[0] for result in results]
        detect(ids, "/home/www-data/panos", argv[0])
                

def find_unauthorised(startid=1, endid=9999):
    conn = psycopg2.connect('dbname=gis user=gis')
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM panoramas WHERE authorised=0 AND id BETWEEN {startid} AND {endid} ORDER BY id")
    results = cur.fetchall()
    return results

def detect(ids, input_path, output_path):
    filenames = [f"{input_path}/{i}.jpg" for i in ids]
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    blur_persons.blur_persons.blur_in_files(
        files=filenames,
        model='xception_coco_voctrainval',
        blur=30,
        classes=['person','car','motorbike'],
        dest=output_path,
        suffix=None,
        quality=None,
        mask=None,
        lite=None,
        dezoom=1.0)
            

if __name__ == "__main__":
    main(sys.argv[1:])
