'use strict';

// TODO fazer um builder para o map

define('Map', () => {

	const Map = class Map {

		constructor(containerId, tipo) {

			const container = document.getElementById(containerId);

			Object.defineProperties(this, {
				container: {value: container},
				_mapa: {writable: true, value: null}
			});

			Object.seal(this);

			this._mapa = new google.maps.Map(
				this.container,
				{
					center: {lat: -25.429558, lng: -49.270999},
					zoom: 15,
					maxZoom: 20,
					minZoom: 10,
					mapTypeControl: false,
					backgroundColor: 'hsl(0, 0%, 100%)'
				}
			);

			this.tipo = tipo;


			/*
			TODO podia fazer um style builder disso

			elementos

			all (default) selects all elements of that feature.
			geometry selects all geometric elements of that feature.
			geometry.fill selects only the fill of the feature's geometry.
			geometry.stroke selects only the stroke of the feature's geometry.
			labels selects only textual labels associated with that feature.
			labels.icon selects only the icon displayed within the feature's label.
			labels.text selects only the text of the label.
			labels.text.fill selects only the fill of the label. The fill of a label is typically rendered as a colored outline that surrounds the label text.
			labels.text.stroke selects only the stroke of the label's text.


			propriedades

			hue (an RGB hex string) indicates the basic color.
			lightness (a floating point value between -100 and 100) indicates the percentage change in brightness of the element. Negative values increase darkness (where -100 specifies black) while positive values increase brightness (where +100 specifies white).
			saturation (a floating point value between -100 and 100) indicates the percentage change in intensity of the basic color to apply to the element.
			gamma (a floating point value between 0.01 and 10.0, where 1.0 applies no correction) indicates the amount of gamma correction to apply to the element. Gammas modify the lightness of hues in a non-linear fashion, while not impacting white or black values. Gammas are typically used to modify the contrast of multiple elements. For example, you could modify the gamma to increase or decrease the contrast between the edges and interiors of elements. Low gamma values (< 1) increase contrast, while high values (> 1) decrease contrast.
			invert_lightness (if true) simply inverts the existing lightness. This is useful, for example, for quickly switching to a darker map with white text.
			visibility (on, off, or simplified) indicates whether and how the element appears on the map. A simplified visibility removes some style features from the affected features; roads, for example, are simplified into thinner lines without outlines, while parks lose their label text but retain the label icon.
			color (an RGB hex string) sets the color of the feature.
			weight (an integer value, greater than or equal to zero) sets the weight of the feature, in pixels. Setting the weight to a high value may result in clipping near tile borders.
			*/

			const manMadeColor = '#EEEEEE';

			const highwayColor = '#8300FF';
			const arterialColor = '#00A7FF'; //'#00BDFF';
			const localColor = '#d7d7d7';

			const estiloDoMapa = [{
				'featureType': 'water',
				'elementType': 'geometry.fill',
				'stylers': [
					{'color': '#a9a9a9'}
				]
			}, {
				'featureType': 'water',
				'elementType': 'labels.text.fill',
				'stylers': [
					{'color': '#FFFFFF'}
				]
			}, {
				'featureType': 'water',
				'elementType': 'labels.text.stroke',
				'stylers': [
					{'visibility': 'off'}
				]


			}, {
				'featureType': 'landscape.natural',
				'stylers': [
					{'color': '#FBFBFB'}
				]
			}, {
				'featureType': 'landscape.man_made',
				'stylers': [
					{'color': manMadeColor}
				]
			}, {
				'featureType': 'landscape.natural.terrain',
				'stylers': [
					{'visibility': 'off'}
				]


			}, {
				'featureType': 'administrative.locality',
				'elementType': 'labels.text.fill',
				'stylers': [
					{'color': '#000000'}
				]
			}, {
				'featureType': 'administrative.locality',
				'elementType': 'labels.text.stroke',
				'stylers': [
					{'color': manMadeColor}
				]


			}, {
				'featureType': 'poi',
				'stylers': [
					{'visibility': 'off'}
				]


			}, {
				'featureType': 'road.highway',
				'elementType': 'geometry.fill',
				'stylers': [
					{'color': '#FFFFFF'}
				]
			}, {
				'featureType': 'road.highway',
				'elementType': 'geometry.stroke',
				'stylers': [
					{'weight': '1'},
					{'color': highwayColor}
				]
			}, {
				'featureType': 'road.highway',
				'elementType': 'labels.text.fill',
				'stylers': [
					{'color': '#FFFFFF'}
				]
			}, {
				'featureType': 'road.highway',
				'elementType': 'labels.text.stroke',
				'stylers': [
					{'color': highwayColor}
				]


			}, {
				'featureType': 'road.arterial',
				'elementType': 'geometry.fill',
				'stylers': [
					{'color': '#FFFFFF'}
				]
			}, {
				'featureType': 'road.arterial',
				'elementType': 'geometry.stroke',
				'stylers': [
					{'weight': '1'},
					{'color': arterialColor}
				]
			}, {
				'featureType': 'road.arterial',
				'elementType': 'labels.text.fill',
				'stylers': [
					{'color': '#FFFFFF'}
				]
			}, {
				'featureType': 'road.arterial',
				'elementType': 'labels.text.stroke',
				'stylers': [
					{'color': arterialColor}
				]


			}, {
				'featureType': 'road.local',
				'elementType': 'geometry.fill',
				'stylers': [
					{'color': '#FFFFFF'}
				]
			}, {
				'featureType': 'road.local',
				'elementType': 'geometry.stroke',
				'stylers': [
					{'weight': '1'},
					{'color': localColor}
				]
			}, {
				'featureType': 'road.local',
				'elementType': 'labels.text.fill',
				'stylers': [
					{'color': '#000000'}
				]
			}, {
				'featureType': 'road.local',
				'elementType': 'labels.text.stroke',
				'stylers': [
					{'weight': '1'},
					{'color': localColor}
				]


			}];

			const mapa = this._mapa;
			const opcoesDeEstilo = {
				map: mapa,
				name: 'personalizado'
			}

			const tipoDeMapa = new google.maps.StyledMapType(estiloDoMapa, opcoesDeEstilo);

			this._mapa.mapTypes.set('personalizado', tipoDeMapa);
			this._mapa.setMapTypeId('personalizado');








			// TODO não é fitBounds, é outra pan event. posso misturar isso com kml e definir uma região que a pessoa possa dar pan
			this._mapa.fitBounds({
				east: -48.76278, // -49.18432, // limite político oficial
				north: -25.259943, // -25.344, // limite político oficial
				south: -25.705823, // -25.645, // limite político oficial
				west: -49.645907 // -49.389 // limite político oficial
			});

			const poi = [

				{latitude: -25.4101691, longitude: -49.2691434, descrição: 'Museu<br />Oscar Niemeyer'},
				{latitude: -25.429169, longitude: -49.3144118, descrição: 'Parque<br />Barigui'},

				{latitude: -25.4389221, longitude: -49.2981447, descrição: 'Prestinaria'},
				{latitude: -25.4623953, longitude: -49.2948617, descrição: 'Panificadora<br />Pantucci'},

				{latitude: -25.4208441, longitude: -49.1341638, descrição: 'Panorâmico<br />Parque Clube'},
				{latitude: -25.533535, longitude: -49.1947036, descrição: 'Entrada mal sinalizada<br />do Aeroporto'}

			];

			// adicionar marcadores
			for (let marcador of poi) {
				this.addMarker(marcador.latitude, marcador.longitude, marcador.descrição);
			}

			// registrar eventos de zoom / pan

		}

		/**
		HYBRID	This map type displays a transparent layer of major streets on satellite images.ROADMAP	This map type displays a normal street map.SATELLITE	This map type displays satellite images.TERRAIN
		*/
		set tipo(tipo) {

			let mapTypeId = null;

			switch(tipo) {
				case 'hybrid':
					mapTypeId = google.maps.MapTypeId.HYBRID;
					break;
				case 'roadmap':
					mapTypeId = google.maps.MapTypeId.ROADMAP;
					break;
				case 'satellite':
					mapTypeId = google.maps.MapTypeId.SATELLITE;
					break;
				case 'terrain':
					mapTypeId = google.maps.MapTypeId.TERRAIN;
					break;
				default:
					mapTypeId = google.maps.MapTypeId.ROADMAP;
					break;
			}

			this._mapa.setMapTypeId(mapTypeId);

		}

		addMarker(latitude, longitude, popUpContent) {

			const location = {lat: latitude, lng: longitude};

			// TODO mudar cursor do marcador
			const marker = new google.maps.Marker({
				position: location,
				animation: google.maps.Animation.DROP,
				optimized: false // correção no bug do cursor do mouse, talvez numa versão futura o google corrija
				// title: 'some string'
			});

			const popUp = new google.maps.InfoWindow({
				content: popUpContent
			});

			marker.addListener('click', () => {
				popUp.open(this._mapa, marker);
				// TODO salvar todos os popups e fechá-los antes de exibir o do marcador
				// estilizar conteúdo
				// centralizar o mapa
				// selecionar na lista de modo desacoplado! então voiu ter que ter um modelo guardando os marcadores, quem está selecionado, etc.
			});

			// TODO salvar o marcador numa array e retornar o índice, será que faço um mini banco como no ici com as colunas? ou faço estilo não relacional?

			marker.setMap(this._mapa);

		}

		removeMarker(index) {
			//const marker =
			marker.setMap();
		}

		addKML(kmlDocument) {

			// mime type application/vnd.google-earth.kml+xml
			// ver o parse que fiz no ios
			// tag placemark
			//		name
			//		polygon
			//			coordinates
			//				string no formato x,y,x espaço x,y,z espaço...

		}

	};

	return Map;

});