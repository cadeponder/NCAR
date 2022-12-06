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

<img width="510" alt="Paleoclimate slide image" src="https://user-images.githubusercontent.com/5427601/201539533-83bad28c-f5d9-4758-851f-cbc17997b340.jpg">
Image from Intro to Paleoclimate lecture slides (Dillon Amaya)

# How we built this
## Webcam tracking of face and hands
We used handtrackingjs code from https://github.com/victordibia/handtracking
This project uses Tensorflow Neural Networks to analyze webcam footage to detect hands and faces. It returns `predictions`, an array with bounding boxes, back to our javascript, which we can use to draw the Earth and sun. This is what the predictions look like:

<img width="510" alt="Screen Shot 2022-11-28 at 4 29 03 PM" src="https://user-images.githubusercontent.com/5427601/204403511-0b25c41b-91a3-4b21-8ace-17d3a2199142.png">


## Drawing images of the Earth and sun based on where the hands and face are
These bounding box coordinates were used to determine where to draw the sun and Earth. We are using [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to render the image of the Earth and the yellow ellipse for the sun.

## Eccentricity: Changing the orbit
For this screen, a sun is drawn over the user's face, and an Earth on their left hand, which they can move side-to-side to adjust the eccentricity of the orbit. The orbit changes based on the distance from the x-position of left hand from the x-position of the head of the user. The orbit was drawn using Canvas's ellipse, which takes an x and y coordinate for the center, radiusX (horizontal radius), radiusY (vertical radius), rotation, startAngle, and endAngle. The further the distance, the larger the radius of the orbit gets. But the orbit needs to be off-center from the sun, so we had to make some calculations to determine the center position. 

Here is a sketch for this calculation. The dotted line is the minimum orbit radius, to constrain the orbit to never be thinner than a circle.

<img width="350" alt="orbitCalc" src="https://user-images.githubusercontent.com/5427601/206037374-c9cae49c-74ca-415a-ba42-19f6faef1147.jpg">

The calculations and canvas drawings for eccentricity are done in the code [here](https://github.com/cadeponder/NCAR/blob/160b83aff16897e5c36af59334e2749ff346df1d/script.js#L448)

## Precession: Changing Perihelion
To allow the visitor to adjust where on the orbit the summer solstice takes place, we used the x-position of the hand to place the Earth on the orbit. We simplified our approach before the demo choose either the perihelion or apihelion of the orbit based on which hand the user points (pointed hand to the left or the right of the user's head).

<img width="350" alt="perihelion sketch" src="https://user-images.githubusercontent.com/5427601/206038697-bf49102c-eafd-47be-b21f-99519229a549.jpg">

The code for the perihelion interaction is [here](https://github.com/cadeponder/NCAR/blob/160b83aff16897e5c36af59334e2749ff346df1d/script.js#L556)

## Obliquity Calculating angles with the hands
For eccentricity, we detected two hands, then calculated the angle between the x and y positions of the hands to change the tilt of the Earth
<img width="350" alt="obliquity sketch" src="https://user-images.githubusercontent.com/5427601/206039362-61fcd729-998c-401e-95c1-9c5e4defacad.jpg">

The code for obliquity is [here](https://github.com/cadeponder/NCAR/blob/160b83aff16897e5c36af59334e2749ff346df1d/script.js#L690)

## Feedback to the user: adjusting the ice on Earth
To show the user how their positioning changes the Earth's temperature, we expanded the Northern ice cap down the Earth. For each of the three cycle factors, a percentage scale was calculated to determine how much the ice sheet should grow.  That then went into a calculation for the parameters to Canvas's arc function to draw an white arc over the Earth (the ice cap).


#### The parameters for the arc are x, y, radius, startAngle, endAngle, and direction:

<img width="350" alt="canvas arc parameters" src="https://user-images.githubusercontent.com/5427601/206040623-5065a295-4c94-4fe6-8bda-253167d21503.png">
(Image from https://www.w3resource.com/html5-canvas/html5-canvas-arc.php)

#### We adjusted the start and endAngles using the percentage scale:

<img width="350" alt="arc calculation sketch" src="https://user-images.githubusercontent.com/5427601/206040507-cbcb1a81-dea3-4f35-ad35-4d2caf73ba30.jpg">

## "Win" conditions
We progressed through each piece of the cycle once a "win" condition was reached for promoting an ice age. The user must first be on the current cycle page for 10 seconds, then they start getting hints about how to move the Earth to achieve the ice age.
1. For eccentricity, the user has to widen the distance from the Earth to the sun to within 25 pixels of 200px.
2. For choosing between perihelion and apihelion, the user has to switch to apihelion and back to perihelion at least once before they can move on.
3. For obliquity, the user has to be within .02 percent of a .25 angle.

Win conditions are defined [here](https://github.com/cadeponder/NCAR/blob/160b83aff16897e5c36af59334e2749ff346df1d/script.js#L62)
