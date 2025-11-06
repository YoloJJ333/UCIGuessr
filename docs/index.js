document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById('start-button');

    startButton.addEventListener('click', () => {
        window.location.href = 'game.html';
    });
});