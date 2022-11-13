# Embodied Ice Age

## Project for NCAR museum ice age exhibit

### Science Intro
Changes in the Earth's position and orbit over long stretches of time make ideal conditions for the onset of cyclical ice ages. 

These conditions, which minimize ice melt during the Northern Hemisphere's summer, are:
1. Obliquity - the tilt in the Earth's axis. 
   * Lower obliquity = less solar radiation in the arctic circle
2. Eccentricity - how wide the Earth's oval orbit
   * High eccentricity makes Earth further away from sun during summer
3. Perihelion at NH winter (caused by a wobble in Earth's spin axis called Precession)
   * Means that during NH summer, Earth is at its farthest point from the sun in its orbit

![ATLAS_Science_Lecture_1b_PaleoClimate pptx](https://user-images.githubusercontent.com/5427601/201539533-83bad28c-f5d9-4758-851f-cbc17997b340.jpg)
Image from Intro to Paleoclimate slides (Dillon Amaya)

### How it was made
#### Webcam tracking of face and hands
Used handtrackingjs code from https://github.com/victordibia/handtracking
* Uses Tensorflow Neural Networks to analyze webcam footage to detect hands and faces

### Dev tasks
- [ ] Make webcam access persist across all pages
    * will need to set cycle param in a different location than current toggleVideo()
- [ ] Obliquity interaction
    * Modify angle display so it maps to the actual axis tilt needed for ice age
- [ ] Eccentricity interaction
    * Modify so that orbit is off center of sun
- [ ] Precession interaction
    * design and create new interaction that allows visitors to change when Perihelion happens
