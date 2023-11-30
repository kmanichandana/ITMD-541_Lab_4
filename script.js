$(document).ready(function () {
  $('#search-btn').on('click', function () {
    const location = $('#location-input').val();
    if (location.trim() !== '') {
      getGeocodeData(location)
        .then(({ lat, lon }) => {
          const todayPromise = getSunriseSunsetData(lat, lon, new Date());
          const tomorrowPromise = getSunriseSunsetData(lat, lon, new Date(new Date().getTime() + 24 * 60 * 60 * 1000));

          Promise.all([todayPromise, tomorrowPromise])
            .then(([todayData, tomorrowData]) => updateDashboard(todayData, tomorrowData))
            .catch(error => showError(error));
        })
        .catch(error => showError(error));
    }
  });

  $('#current-location-btn').on('click', function () {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const todayPromise = getSunriseSunsetData(position.coords.latitude, position.coords.longitude, new Date());
          const tomorrowPromise = getSunriseSunsetData(
            position.coords.latitude,
            position.coords.longitude,
            new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
          );

          Promise.all([todayPromise, tomorrowPromise])
            .then(([todayData, tomorrowData]) => updateDashboard(todayData, tomorrowData))
            .catch(error => showError(error));
        },
        error => showError(`Geolocation error: ${error.message}`)
      );
    } else {
      showError('Geolocation is not supported by your browser.');
    }
  });
});

function getGeocodeData(location) {
  const geocodeAPI = `https://geocode.maps.co/search?q=${encodeURIComponent(location)}`;

  return fetch(geocodeAPI)
    .then(response => response.json())
    .then(results => {
      if (results.error) {
        throw new Error(`Geocode API Error: ${results.error}`);
      }

      const coordinates = findCoordinates(results);

      if (!coordinates) {
        throw new Error(`No results found for the location: ${location}`);
      }

      return coordinates;
    });
}

function findCoordinates(result) {
  if (result.lat && result.lon) {
    return { lat: result.lat, lon: result.lon };
  }

  for (const key in result) {
    if (typeof result[key] === 'object') {
      const coordinates = findCoordinates(result[key]);
      if (coordinates) {
        return coordinates;
      }
    }
  }

  return null;
}

function getSunriseSunsetData(latitude, longitude, date) {
  const formattedDate = date.toISOString().split('T')[0];
  const sunriseAPI = `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}`;

  return fetch(sunriseAPI)
    .then(response => response.json())
    .then(data => {
      if (data.status !== 'OK') {
        throw new Error(`Sunrise Sunset API Error: ${data.status}`);
      }

      return data.results;
    });
}

function updateDashboard(todayData, tomorrowData) {
  const formatHTML = (data, title) => `
    <h2>${title}</h2>
    <p>Sunrise: ${data.sunrise}</p>
    <p>Sunset: ${data.sunset}</p>
    <p>Dawn: ${data.dawn}</p>
    <p>Dusk: ${data.dusk}</p>
    <p>Day Length: ${data.day_length}</p>
    <p>Solar Noon: ${data.solar_noon}</p>
    <p>Time Zone: ${data.timezone}</p>
  `;

  $('#today-data').html(formatHTML(todayData, 'Today'));
  $('#tomorrow-data').html(formatHTML(tomorrowData, 'Tomorrow'));

  $('#dashboard').removeClass('hidden');
  $('#error-message').addClass('hidden');
}

function showError(message) {
  $('#error-message').text(message).removeClass('hidden');
  $('#dashboard').addClass('hidden');
}
