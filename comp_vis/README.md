# Face and License Plate Detection Experiments

These are experiments to detect faces and license plates:

- `detect1` : mostly based on [the TrekView example](https://github.com/trek-view/pii-blur). Limited success so far
- `detect2` : using [understand.ai's Anonymizer](https://github.com/understand-ai/anonymizer). Encouraging results so far. To get this to work you'll need to setup the understand.ai anonymizer according to the instructions on their github repo, and then copy the `bot.py` script into its working directory. Note that a virtual environment should be used, as directed, as it relies on TensorFlow 1.x whereas 2.x has now been released.
- `detect3` : using [Tyndare's blur-persons](https://github.com/tyndare/blur-persons). Good results, extensive blurring of people and vehicles, and good detection. Occasional faces missing (e.g. pano 9630 from OTV) though in this case understand.ai's anonymizer (above) did the blurring. Slower (5 mins per pano) due to segmenting the image but the high rate of detection is encouraging. Maybe pass through this and then through understand.ai's anonymizer for maximum effectiveness?
