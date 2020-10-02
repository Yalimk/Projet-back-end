const socket = io('https://alexandre-masson.herokuapp.com');
let avatarDiv;
let scoreDiv;
let winDiv = document.getElementById('win');
const greeting = document.getElementById('greeting');

socket.on('connect', () => {
  socket.login = greeting.innerText;
  socket.emit('playerPseudo', socket.login);

  /** FONCTIONS DE CREATION DES AVATARS ET DES SCORES **/
  const createOrUpdateAvatar = avatar => {
    avatarDiv = window.document.getElementById(avatar.id);
    if (!avatarDiv) {
      avatarDiv = window.document.createElement('div');
      window.document.body.append(avatarDiv);
    };
    avatarDiv.id = avatar.id;
    avatarDiv.style.backgroundColor = avatar.backgroundColor;
    avatarDiv.style.border = avatar.border;
    avatarDiv.style.borderRadius = avatar.borderRadius;
    avatarDiv.style.color = avatar.color;
    avatarDiv.style.height = avatar.height;
    avatarDiv.style.left = avatar.left + 'px';
    avatarDiv.style.position = avatar.position;
    avatarDiv.style.top = avatar.top + 'px';
    avatarDiv.style.width = avatar.width;
    avatarDiv.innerText = `${avatar.innerText.charAt(0).toUpperCase()}${avatar.innerText.slice(1)}`;
    avatarDiv.style.fontWeight = "bold";
    avatarDiv.style.fontSize = "1.5rem";
    avatarDiv.score = avatar.score;
  };

  const createScores = score => {
    scoreDiv = window.document.getElementById(score.id);
    if (!scoreDiv) {
      scoreDiv = window.document.createElement('div');
      window.document.body.append(scoreDiv);
    }
    scoreDiv.id = score.id;
    scoreDiv.style.position = score.position;
    scoreDiv.style.color = score.color;
    scoreDiv.style.top = score.top + 'px';
    scoreDiv.style.fontSize = score.fontSize;
    scoreDiv.style.fontWeight = score.fontWeight;
  };

  socket.on('displayScores', score => {
    createScores(score);
  });

  socket.on('displayAllPlayers', allPlayers => {
    for (const onePlayer of allPlayers) {
      createOrUpdateAvatar(onePlayer);
    }
  });

  socket.on('createAvatar', avatar => {
    createOrUpdateAvatar(avatar);
    if (avatarDiv.offsetLeft >= 850) {
      scoreDiv.innerText = `${avatarDiv.innerText} a déjà fait ${avatarDiv.score + 1} longueur(s) !`;
    }
    if (avatarDiv.score === 3) {
      winDiv.style.display = "flex";
      winDiv.innerText = `${avatarDiv.innerText} remporte la partie !
      Redirection vers la page d'accueil dans 5 secondes`;
      setTimeout(() => {
        window.location = 'https://alexandre-masson.herokuapp.com/login';
      }, 5000);
    }
  });

  /** GESTION DES MOUVEMENTS DES JOUEURS **/
  const movement = {
    right: false,
  };
  window.addEventListener('keydown', keydownEvent => {
    switch (keydownEvent.key) {
      case 'ArrowRight':
        keydownEvent.preventDefault();
        movement.right = true;
        break;
    }
  });
  window.addEventListener('keyup', keyupEvent => {
    switch (keyupEvent.key) {
      case 'ArrowRight':
        keyupEvent.preventDefault();
        socket.emit('keypress', movement);
        movement.right = false;
        break;
    }
  });

  socket.on('removeAvatar', avatar => {
    const avatarDiv = window.document.getElementById(avatar.id);
    if (avatarDiv) {
      avatarDiv.parentNode.removeChild(avatarDiv);
    };
  });
});