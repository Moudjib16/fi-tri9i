
let arrow = document.getElementById('arrow');
let menu = document.getElementById('menu');
let visible = false;



arrow.addEventListener('click',function(){

    if( !visible ){
        visible= !visible;
        menu.style.display = 'flex';
        arrow.style.rotate ='180deg';
    }
    else
    {
        visible= !visible;
        menu.style.display = 'none';
        arrow.style.rotate ='0deg';
    }
    

})








document.getElementById('look').addEventListener('click', function() {
    var input1 = document.getElementById('input1').value.trim();
    var input2 = document.getElementById('input2').value.trim();
    var input3 = parseInt(document.getElementById('input3').value);

    if (input1 === '' || input2 === '' || isNaN(input3) || input3 < 1 || input3 > 5) {
        alert('Veuillez remplir tous les champs correctement.');
        return;
    }

    var parametre = [input1, input2, input3];
    console.log('Paramètres:', parametre);

    var queryString = '?input1=' + encodeURIComponent(parametre[0]) + '&input2=' + encodeURIComponent(parametre[1]) + '&input3=' + encodeURIComponent(parametre[2]);
    var nextPageURL = '../recherche/pass.html' + queryString;
    window.location.href = nextPageURL; // Redirect to pass.html with parameters
});