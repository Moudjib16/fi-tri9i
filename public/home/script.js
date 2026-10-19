let arrow = document.getElementById('arrow');
let menu = document.getElementById('menu');
let visible = false;

arrow.addEventListener('click', function () {
    visible = !visible;
    menu.style.display = visible ? 'flex' : 'none';
    arrow.style.rotate = visible ? '180deg' : '0deg';
});
