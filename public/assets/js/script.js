(() => {

	function showFace(face) {
		$('body').attr('data-show', face);
	}

	function showHideLoginError() {
		if (loginErrorState) {
			$('.error-msg').html(loginErrorMessage);
			$('.error-msg').addClass('shown');
		}
		else {
			$('.error-msg').empty;
			$('.error-msg').removeClass('shown');
		}
	}

	function logout() {

		if (isPlaying) {
			$("#player").midiPlayer.stop();
			isPlaying = false;
			$('body').removeClass().addClass('paused');
		}

		file = null;

		$('.cube-face-now-playing .title').html(null);
		$('.cube-face-now-playing .artist').html(null);


		$('.list').children().remove();
		$('body').attr('data-show', 'login');
		$('input').val('');
		$('#user').focus();
	}

	function getSongs(user,pw,face) {

		var allSongs;
		var downloadedSongs;
		var $list = $('.list');

		// first ajax to check credentials and grab downloaded songs

		$.ajax({
			type: 'GET',
			url: `https://kepler.space/frontend2019/singing_window/listSongs?email=${user}&password=${pw}`,
			dataType: 'xml',
			timeout: 800000,
			success: function (xml) {
				var xmlResponse = $(xml).find('response');
				if (xmlResponse.attr('success') != 'true') {
					loginErrorState = true;
					loginErrorMessage = xmlResponse.text();
					showHideLoginError();
				}
				if (!loginErrorState) {
					downloadedSongs = xml;
					
					// and do a second ajax to grab list of all songs

					$.ajax({
						type: 'GET',
						url: 'https://kepler.space/frontend2019/singing_window/listSongs',
						dataType: 'xml',
						timeout: 800000,
						success: function (xml) {

							allSongs = xml;

							// let's empty our list out

							$('.list').children().remove();

							// for each song, we compare songids with the downloaded
							// ones, and flip a variable if we find a match.

							$(allSongs).find('song').each(function () {

								var title = $(this).attr('name');
								var artist = $(this).attr('artist');
								var id = $(this).text();
								var isDownloaded = false;

								$(downloadedSongs).find('song').each(function () {

									var did = $(this).text();

									if (did == id)
										isDownloaded = true;
								});

								// add an item to the playlist          
								$list.append(`<li class="item" data-title="${title}" data-artist="${artist}" data-id="${id}"><div class="status downloaded-${isDownloaded}"></div><div class="title-artist">${artist} - ${title}</div></li>`);
							});

							showFace(face);

							$('.item').on('click', function() {

								var title = $(this).attr('data-title');
								var artist = $(this).attr('data-artist');
								var id = $(this).attr('data-id');

								loadSong(title,artist,id,user,pw);
							});
			 			},
						error: function (e) {
							console.log("ERROR : ", e);
						}
					});
				}
			},
			error: function (e) {
				console.log("ERROR : ", e);
			}
		});
	}

	function createUser(user,pw) {
		$.ajax({
			type: 'GET',
			url: `https://kepler.space/frontend2019/singing_window/createUser?name=kcubename&email=${user}&password=${pw}`,
			dataType: 'xml',
			timeout: 800000,
			success: function (xml) {
				var xmlResponse = $(xml).find('response');
				if (xmlResponse.attr('success') != 'true') {
					loginErrorState = true;
					loginErrorMessage = xmlResponse.text();
					showHideLoginError();
				}
				if (!loginErrorState) {
					getSongs(user,pw,'playlist');
				}
 			},
			error: function (e) {
				console.log("ERROR : ", e);
			}
		});
	}

	function pauseSong() {
		pause();
		isPlaying = false;
		$('body').removeClass().addClass('paused');
	}

	function playSong() {
		play();
		isPlaying = true;
		$('body').removeClass().addClass('playing');
	}

	function loadSong(title,artist,id,user,pw) {

		if (isPlaying)
			pauseSong();

		$.ajax({
			type: 'GET',
			url: `https://kepler.space/frontend2019/singing_window/getSong?email=${user}&password=${pw}&songid=${id}`,
			dataType: 'xml',
			timeout: 800000,
			success: function (xml) {

				var hexdata = $(xml).find('rawdata').html();

				function hexToBase64(hexstring) {
					return btoa(hexstring.match(/\w{2}/g).map(function(a) {
						return String.fromCharCode(parseInt(a, 16));
					}).join(""));
				}
				var base64data = hexToBase64(hexdata);

				function saveAs(uri, filename) {
					var link = document.createElement('a');
					if (typeof link.download === 'string') {
						link.href = uri;
						link.download = filename;

						//Firefox requires the link to be in the body
						document.body.appendChild(link);

						//simulate click
						link.click();

						//remove the link when done
						document.body.removeChild(link);
					}
					else {
						window.open(uri);
					}
				}

				// midi player can't handle quick stops and starts

				setTimeout(function() {

					var file = 'data:audio/midi;base64,' + base64data;

					$('.cube-face-now-playing .title').html(title);
					$('.cube-face-now-playing .artist').html(artist);


					$("#player").midiPlayer.play(file);
					isPlaying = true;
					$('body').removeClass().addClass('playing');

					$('.btn-dl').on('click', function() {
						saveAs(file, `${artist} - ${title}.mid`);
					});

				},1000);

				getSongs(user,pw,'now-playing');
 			},
			error: function (e) {
				console.log("ERROR : ", e);
			}
		});
	}


	// initial state

	var isPlaying = false;
	var loginErrorState = false;
	var loginErrorMessage;

	$('#user').focus();


	// event listeners

	$('.cube-face-login .btn').on('click', function() {

		var action = $(this).attr('data-action');
		var user = $('#user').val();
		var pw = $('#pw').val();
		loginErrorState = false;

		showHideLoginError();

		// input "validation"

		$('#user, #pw').each(function () {
			if (!$(this).val()) {
				loginErrorState = true;
				loginErrorMessage = 'enter email and pw';
				showHideLoginError();
			}
		}); 

		if (!loginErrorState) {
			if (action == 'login')
				getSongs(user,pw,'playlist');
			if (action == 'signup')
				createUser(user,pw);
		}
	});

	$('.cube-face-now-playing .controls .btn').on('click', function() {
		if (isPlaying)
			pauseSong();
		else
			playSong();
	});

	$('.dot').on('click', function() {
		var face  = $(this).attr('data-face');
		showFace(face);
	});

	$('.btn-logout').on('click', function() {
		logout();
	});

})();
