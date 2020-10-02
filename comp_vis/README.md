# Face and License Plate Detection Experiments

These are experiments to detect faces and license plates:

- `detect1` : mostly based on [the TrekView example](https://github.com/trek-view/pii-blur). Limited success so far
- `detect2` : using [understand.ai's Anonymizer](https://github.com/understand-ai/anonymizer). Encouraging results so far. To get this to work you'll need to setup the understand.ai anonymizer according to the instructions on their github repo, and then copy the `bot.py` script into its working directory. Note that a virtual environment should be used, as directed, as it relies on TensorFlow 1.x whereas 2.x has now been released.
