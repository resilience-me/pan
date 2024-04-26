function adjustLogo() {
    var windowHeight = window.innerHeight;
    var contentHeight = document.getElementById('content').offsetHeight;
    var footerHeight = document.querySelector('footer').offsetHeight;
    var bodyStyles = window.getComputedStyle(document.body);
    var bodyPaddingVertical = parseInt(bodyStyles.paddingTop) + parseInt(bodyStyles.paddingBottom);
    var logoContainerHeight = windowHeight-bodyPaddingVertical-contentHeight-footerHeight-20;
    var bodyPaddingHorizontal = parseInt(bodyStyles.paddingLeft) + parseInt(bodyStyles.paddingRight);
    var logoContainerWidth = window.innerWidth-bodyPaddingHorizontal;
    var logoWidth = logoContainerWidth;
    var logoHeight = logoContainerHeight;
    if(logoContainerWidth > logoContainerHeight) logoWidth = logoHeight;
    else logoHeight = logoWidth;
    var logoContainer = document.querySelector('.logoContainer');
    logoContainer.style.height = `${logoHeight}px`;
    logoContainer.style.width = `${logoWidth}px`;
    
    var horizontalOffset = (logoContainerWidth - logoWidth) / 2;
    var verticalOffset = (logoContainerHeight - logoHeight) / 2;
    
    var logoImage = document.querySelector('.logoImage');
    logoImage.style.paddingLeft = `${horizontalOffset}px`;
    logoImage.style.paddingTop = `${verticalOffset}px`;
}
window.onresize = adjustLogo;
