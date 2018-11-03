/*
	Jay Deshpande
	
	Populates the pokedex with pokemon and enables the user to select certain pokemon. Displays
	information about the selected pokemon. Implements UW CSE pokemon game engine to enable battle 
	with opposing pokemon.
*/

"use strict";
(function() {
	const URL = "https://webster.cs.washington.edu/pokedex/";
	let foundPokemon = ["Bulbasaur", "Charmander", "Squirtle"];
	let guid = ""; // game user id
	let pid = ""; // player id
	let startingHP = "";  // initial health points of chosen Pokemon

	window.onload = function() {
		fetch(URL + "pokedex.php?pokedex=all")
			.then(checkStatus)
			.then(function(responseText) {
				populatePokedex(responseText);
			})
			.catch(console.log());
		$("start-btn").onclick = startGame;
	};

	/**
 	* Populates the pokedex with all found and unfound pokemon.
 	* @param {object} responseText - api response with all pokemon and their respective image names
 	* @return {object} DOM object associated with id
 	*/
	function populatePokedex(responseText) {
		let spritePath = URL + "sprites/";
		let pokedex = $("pokedex-view");
		let response = responseText.split("\n");
		for (let i = 0; i < response.length; i++) {
			let poke = response[i].split(":");
			// Assume that poke always has two elements.
			let newPokemon = document.createElement("img");
			newPokemon.setAttribute("src", spritePath + poke[1]);
			newPokemon.setAttribute("id", poke[0]);
			newPokemon.setAttribute("class", "sprite");
			pokedex.appendChild(newPokemon);
		}
		findPokemon();
	}

	/**
 	* Applies styling and functionality to found pokemon
 	*/
	function findPokemon() {
		for (let i = 0; i < foundPokemon.length; i++) {
			let chosenPokemon = $(foundPokemon[i]);
			chosenPokemon.classList.add("found");
			chosenPokemon.onclick = function() {
				populateMyCard(this);
			};
		}
	}

	/**
 	* Fills pokemon card with info when a found pokemon is selected
 	* @param {object} chosenPokemon - user-selected found pokemon
 	*/
	function populateMyCard(chosenPokemon) {
		fetch(URL + "pokedex.php?pokemon=" + chosenPokemon.id)
			.then(checkStatus)
			.then(function(responseText) {
				$("start-btn").classList.remove("hidden");
				fillCard(JSON.parse(responseText), $("my-card"));
				
			})
			.catch(console.log());
	}

	/**
 	* Sets card values for a chosen pokemon.
 	* @param {object} response - JSON api response
 	* @param {dom object} card - pokemon card
 	*/
	function fillCard(response, card) {
		card.getElementsByClassName("name")[0].innerText = response['name'];
		card.getElementsByClassName("pokepic")[0].src = URL + response['images']['photo'];
		card.getElementsByClassName("type")[0].src = URL + response['images']['typeIcon'];
		card.getElementsByClassName("weakness")[0].src = URL + response['images']['weaknessIcon'];
		card.getElementsByClassName("hp")[0].innerText = response['hp'] + "HP";
		card.getElementsByClassName("info")[0].innerText = response['info']['description'];
		// each pokemon has a maximum of 4 moves
		for (let i = 0; i < 4; i++) {
			if (i < response['moves'].length) {
				card.getElementsByTagName("button")[i].classList.remove("hidden");
				card.getElementsByClassName("moves")[0].getElementsByClassName("move")[i]
					.innerText = response['moves'][i]['name'];
				let moveIconPath = URL + "icons/" + response['moves'][i]['type'] + ".jpg";
				card.getElementsByClassName("moves")[0].getElementsByTagName("img")[i].src =
					moveIconPath;
				if (response['moves'][i]['dp']) {
					card.getElementsByClassName("moves")[0].getElementsByClassName("dp")[i]
						.innerText = response['moves'][i]['dp'] + "DP";
				} else {
					card.getElementsByClassName("moves")[0].getElementsByClassName("dp")[i]
						.innerText = "";
				}
			} else {
				card.getElementsByTagName("button")[i].classList.add("hidden");
			}		
		}
	}

	/**
 	* Begins a duel with a random opponent pokemon
 	*/
	function startGame() {
		startingHP = $("my-card").getElementsByClassName("hp")[0].innerText;
		$("start-btn").classList.add("hidden");
		$("pokedex-view").classList.add("hidden");
		$("their-card").classList.remove("hidden");
		document.getElementsByClassName("hp-info")[0].classList.remove("hidden");
		$("results-container").classList.remove("hidden");
		$("flee-btn").classList.remove("hidden");
		$("flee-btn").disabled = false;
		$("flee-btn").onclick = 
			function() {
				updateGame("flee");
			};
		for (let i = 0; i < 4; i++) { // ensures only the move buttons are impacted
			$("my-card").getElementsByTagName("button")[i].disabled = false;
			$("my-card").getElementsByTagName("button")[i].onclick = 
				function() {
					let moveName = this.getElementsByClassName("move")[0].innerText;
					updateGame(moveName);
				};
		}
		$("title").innerText = "Pokemon Battle Mode!";
		let data = new FormData();
		data.append("startgame", true);
		data.append("mypokemon", $("my-card").getElementsByClassName("name")[0].innerText);
		fetch(URL + "game.php", {method : "POST", body : data})
			.then(checkStatus)
			.then(function(responseText) {
				document.getElementsByClassName("buffs")[0].classList.remove("hidden");
				document.getElementsByClassName("buffs")[1].classList.remove("hidden");
				let response = JSON.parse(responseText);
				guid = response['guid'];
				pid = response['pid'];
				fillCard(response['p2'], $("their-card"));
			})
			.catch(console.log());
	}

	/**
 	* Uses the game engine to update the game state after a move is chosen by the user
 	* @param {string} moveName - chosen move
 	*/
	function updateGame(moveName) {
		moveName = moveName.toLowerCase();
		moveName = moveName.replace(/ +/g, "");
		let data = new FormData();
		data.append("guid", guid);
		data.append("pid", pid);
		data.append("movename", moveName);
		fetch(URL + "game.php", {method : "POST", body : data})
			.then(checkStatus)
			.then(function(responseText) {
				$("loading").classList.add("hidden");
				let response = JSON.parse(responseText);
				updateHP(response);
				if (response['p1']['current-hp'] < 1 || response['p2']['current-hp'] < 1) {
					endGame(response, response['p1']['current-hp'] > 1);
				} else {
					guid = response['guid'];
					updateCards(response);
				}
			})
			.catch(console.log());
		$("loading").classList.remove("hidden");
	}

	/**
 	* Updates the hp and hp bar for each battling pokemon
 	* @param {JSON object} response - game engine JSON response
 	*/
	function updateHP(response) {
		$("my-card").getElementsByClassName("hp")[0].innerText = 
			response['p1']['current-hp'] + "HP";
		$("their-card").getElementsByClassName("hp")[0].innerText = 
			response['p2']['current-hp'] + "HP";
		let p1HP = 100 * (response['p1']['current-hp'] / response['p1']['hp']);
		document.getElementsByClassName("health-bar")[0].style.width = p1HP + "%";
		if (p1HP < 20) {
			document.getElementsByClassName("health-bar")[0].classList.add("low-health");
		}
		let p2HP = 100 * (response['p2']['current-hp'] / response['p2']['hp']);
		document.getElementsByClassName("health-bar")[1].style.width = p2HP + "%";
		if (p2HP < 20) {
			document.getElementsByClassName("health-bar")[1].classList.add("low-health");
		}
	}

	/**
 	* Updates the pokemon cards and page with information from the game engine response
 	* @param {JSON object} response - game engine JSON response
 	*/
	function updateCards(response) {
		clearBuffs();
		if (response['p1']['buffs'].length > 0) {
			addBuff(response['p1']['buffs'], document.getElementsByClassName("buffs")[0], "buff");
		}
		if (response['p1']['debuffs'].length > 0) {
			addBuff(response['p1']['debuffs'], 
				document.getElementsByClassName("buffs")[0], "debuff");
		}
		if (response['p2']['buffs'].length > 0) {
			addBuff(response['p2']['buffs'], document.getElementsByClassName("buffs")[1], "buff");
		}
		if (response['p2']['debuffs'].length > 0) {
			addBuff(response['p2']['debuffs'], 
				document.getElementsByClassName("buffs")[1], "debuff");
		}
		displayMoveResult(response);
	}

	/**
 	* Displays the result of battling pokemon's moves
 	* @param {JSON object} response - game engine JSON response
 	*/
	function displayMoveResult(response) {
		$("results-container").classList.remove("hidden");
		$("p1-turn-results").classList.remove("hidden");
		$("p2-turn-results").classList.remove("hidden");
		$("p1-turn-results").innerText = "Player 1 played " + response['results']['p1-move'] + 
			" and " + response['results']['p1-result'] + "!";
		$("p2-turn-results").innerText = "Player 2 played " + response['results']['p2-move'] + 
			" and "  + response['results']['p2-result'] + "!";
	}

	/**
 	* Sets buffs and debuffs for each player's pokemon
 	* @param {array} buffs - all buffs or debuffs given by the game engine
 	* @param {dom object} parentDiv - pokemon card to place the buffs on
 	* @param {string} buffOrDebuff - whether to make a buff or debuff dom object
 	*/
	function addBuff(buffs, parentDiv, buffOrDebuff) {
		for (let i = 0; i < buffs.length; i++) {
			let newBuff = document.createElement("div");
			newBuff.classList.add(buffOrDebuff);
			newBuff.classList.add(buffs[i]);
			parentDiv.appendChild(newBuff);
		}
	}

	/**
 	* Deletes all buff dom elements
 	*/
	function clearBuffs() {
		let buffs = document.getElementsByClassName("buffs");
		for (let i = 0; i < buffs.length; i++){
			while (buffs[i].firstChild) {
				buffs[i].removeChild(buffs[i].firstChild);
			}
		}
	}

	/**
 	* Provides functionality when the game is over
 	* @param {JSON object} response - game engine JSON response
 	* @param {boolean} p1Win - true if player one won the battle
 	*/
	function endGame(response, p1Win) {
		for (let i = 0; i < 4; i++) { // ensures only the move buttons are impacted
			$("my-card").getElementsByTagName("button")[i].disabled = true;
		}
		$("flee-btn").disabled = true;
		$("endgame").classList.remove("hidden");
		$("endgame").onclick = function() {
			$("endgame").classList.add("hidden");
			$("results-container").classList.add("hidden");
			$("p1-turn-results").classList.add("hidden");
			$("p2-turn-results").classList.add("hidden");
			$("their-card").classList.add("hidden");
			$("start-btn").classList.remove("hidden");
			$("pokedex-view").classList.remove("hidden");
			$("flee-btn").classList.add("hidden");
			clearBuffs();
			$("title").innerText = "Your Pokedex";
			$("my-card").getElementsByClassName("hp")[0].innerText = startingHP;
			document.getElementsByClassName("hp-info")[0].classList.add("hidden");
			document.getElementsByClassName("health-bar")[0].style.width = "100%";
			document.getElementsByClassName("health-bar")[1].style.width = "100%";
			document.getElementsByClassName("health-bar")[0].classList.remove("low-health");
			document.getElementsByClassName("health-bar")[1].classList.remove("low-health");
		};
		displayMoveResult(response);
		// If you won don't print opponent's move
		if (!response['results']['p2-move']) {
			$("p2-turn-results").classList.add("hidden");
		}
		if (p1Win) {
			$("title").innerText = "You Won!";
			// If opponent pokemon is not already found add it to pokedex
			let oppPokemon = $("their-card").getElementsByClassName("name")[0].innerText;
			if (!foundPokemon.includes(oppPokemon)) {
				$(oppPokemon).classList.add("found");
				$(oppPokemon).onclick = function() {
					populateMyCard(this);
				};
			}
		}
		else {
			$("title").innerText = "You Lost!";
		}
	}

	/**
 	* Determines if api call is successful.
 	* @param {object} response - element ID
 	* @return {object} text version of api response
 	*/
	function checkStatus(response) {
		if (response.status >= 200 && response.status < 300) {
			return response.text();
		} else {
			return Promise.reject(new Error(response.status + ": " + response.statusText));
		}
	}

	/**
 	* Returns the element that has the ID attribute with the specified value.
 	* @param {string} id - element ID
 	* @return {object} DOM object associated with id
 	*/
	function $(id) {
		return document.getElementById(id);
	}

})();