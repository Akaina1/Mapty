'use strict';
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 1. DOM Elements

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const submitButton = document.querySelector('.form__btn--submit');
const clearButton = document.querySelector('.form__btn--clear');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// all global variables are accessible from other script files as well
// 3. Workout Class
class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);          // convert date to string and slice last 10 characters
    constructor(coords, distance, duration) {
        this.coords = coords;                   // [lat, lng]
        this.distance = distance;               // in km
        this.duration = duration;               // in min
    };

    _setDescription() {
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}
        ${this.date.getDate()}`;
    };  
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 4. App Class
class App {
    #map;               // private instance property
    #mapEvent;          // private instance property
    #workouts = [];     // private instance property

    constructor() {
        this._getPosition();        // call _getPosition method of App class

        this._getLocalStorage();    // call _getLocalStorage method of App class

        // Toggle input fields
        inputType.addEventListener('change', this._toggleElevationField);               // add event listener to inputType - bind this to App class
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));      // add event listener to containerWorkouts - bind this to App class
        submitButton.addEventListener('click', this._newWorkout.bind(this));
        clearButton.addEventListener('click', this._clearLocalStorage.bind(this));
    };

    _getPosition() {
        if (navigator.geolocation)                          // check if browser supports geolocation)
            navigator.geolocation.getCurrentPosition(       // navigator is a global object, geolocation is a property of navigator object, getCurrentPosition is a method of geolocation object (used to get current position of user)
                this._loadMap.bind(this),                   // success callback function (this._loadMap is a method of App class)
                function () {
                    alert('Could not get your position');   // error callback function
                });
    };

    _loadMap(position) {
        const { latitude } = position.coords;   
        const { longitude } = position.coords;
       

        const coords = [latitude, longitude];               // array of latitude and longitude
        this.#map = L.map('map').setView(coords, 13);       // set the view of map to current position of user

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { // using leaflet library to display map
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        }).addTo(this.#map); // add tile layer to map

        // Handling clicks on map
        this.#map.on('click', this._showForm.bind(this));   // add event listener to map - bind this to App class

        this.#workouts.forEach(work => {
            this.renderWorkoutMarker(work);
        });
    };

    _showForm(mapE) {
        this.#mapEvent = mapE;                   // mapEvent is a global variable
        form.classList.remove('hidden');         // remove hidden class from form
        inputDistance.focus();                   // focus on inputDistance  
    };

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');     // toggle hidden class of inputElevation
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');       // toggle hidden class of inputCadence
    };

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));   // check if inputs are numbers
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);                // check if inputs are positive numbers
        e.preventDefault();                                                             // prevent default behaviour of form

        // get data from form
        const type = inputType.value; 
        const distance = +inputDistance.value;
        const duration = +inputDuration.value; 
        const { lat, lng } = this.#mapEvent.latlng; 
        let workout;

        // if workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;                                               
            // check if data is valid
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('Inputs have to be positive numbers!'); 

            workout = new Running([lat, lng], distance, duration, cadence);
        };

        // if workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value; 
            // check if data is valid
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('Inputs have to be positive numbers!'); 

            workout = new Cycling([lat, lng], distance, duration, elevation);
        };

        // add new object to workout array
        this.#workouts.push(workout);
        //console.log(workout);

        // render workout on map as marker
        this.renderWorkoutMarker(workout);

        // render workout on list
        this.renderWorkout(workout);

        // hide form + Clear input fields
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        // set local storage
        this._setLocalStorage();
    };



    renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.type}`)
            .openPopup();
    };

    renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
        <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
        </div>`;

        if (workout.type === 'running')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
            </div>
            </li>`;

        if (workout.type === 'cycling')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
            </div>
            </li>`;

        // add space before adding html to sidebar
        form.insertAdjacentHTML('afterend', html);
    };

// create method to move to marker on map
    _moveToPopup(e) { 
        const workoutEl = e.target.closest('.workout');                                 // closest is a method of DOM element
     
        if (!workoutEl) return; // guard clause

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id); // find workout with same id as workoutEl
      
        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    };

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));       // set item in local storage
    };

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));              // get item from local storage
        console.log(data);

        if (!data) return; 

        this.#workouts = data;                                                  // set workouts array to data from local storage

        this.#workouts.forEach(work => {
            this.renderWorkout(work);
        });
    };

    _clearLocalStorage() {
        localStorage.removeItem('workouts');                            // remove item from local storage
        alert('All workouts have been deleted!');                      
        location.reload();                                              // reload page
    };

};
const app = new App(); // create new object of App class
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 5. Running Class

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);                                  // call constructor of parent class
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();                                             // call _setDescription method of Workout class
    };

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    };
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 6. Cycling Class

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);                                  // call constructor of parent class
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();                                             // call _setDescription method of Workout class
    };
    
    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    };
};




