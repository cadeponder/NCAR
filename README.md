# Embodied Ice Age

#### Project for NCAR museum ice age exhibit
https://cadeponder.github.io/NCAR/

## Science Intro
Changes in the Earth's position and orbit over long stretches of time make ideal conditions for the onset of cyclical ice ages. 

These conditions, which minimize ice melt during the Northern Hemisphere's summer, are:
1. Eccentricity - how wide the Earth's oval orbit
   * High eccentricity makes Earth further away from sun during summer
2. Perihelion at NH winter (caused by a wobble in Earth's spin axis called Precession)
   * Means that during NH summer, Earth is at its farthest point from the sun in its orbit
3. Obliquity - the tilt in the Earth's axis. 
   * Lower obliquity = less solar radiation in the arctic circle

![ATLAS_Science_Lecture_1b_PaleoClimate pptx](https://user-images.githubusercontent.com/5427601/201539533-83bad28c-f5d9-4758-851f-cbc17997b340.jpg)
Image from Intro to Paleoclimate slides (Dillon Amaya)

## How we built this
### Webcam tracking of face and hands
We used handtrackingjs code from https://github.com/victordibia/handtracking
This project uses Tensorflow Neural Networks to analyze webcam footage to detect hands and faces. It returns `predictions`, an array with bounding boxes, back to our javascript, which we can use to draw the Earth and sun. This is what the predictions look like:
<img width="510" alt="Screen Shot 2022-11-28 at 4 29 03 PM" src="https://user-images.githubusercontent.com/5427601/204403511-0b25c41b-91a3-4b21-8ace-17d3a2199142.png">


### Drawing images of the Earth and sun based on where the hands and face are
These bounding box coordinates were used to determine where to draw the sun and Earth. We are using (Canvas API)[https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API] to render the image of the Earth and the yellow ellipse for the sun.


### Eccentricity: Changing the orbit
todo: write about this 

### Precession: Changing Perihelion
todo: write about this 

### Obliquity Calculating angles with the hands
todo: write about this 
