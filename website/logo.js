function adjustLogo() {
    var windowHeight = window.innerHeight;
    var contentHeight = document.getElementById('content').offsetHeight;
    var footerHeight = document.querySelector('footer').offsetHeight;
    var bodyStyles = window.getComputedStyle(document.body);
    var bodyPaddingVertical = parseInt(bodyStyles.paddingTop) + parseInt(bodyStyles.paddingBottom);
    var logoContainerHeight = windowHeight-bodyPaddingVertical-contentHeight-footerHeight-20;
    var bodyPaddingHorizontal = parseInt(bodyStyles.paddingLeft) + parseInt(bodyStyles.paddingRight);
    var logoContainerWidth = window.innerWidth-bodyPaddingHorizontal;
    var logoSize;
    if(logoContainerWidth > logoContainerHeight) logoSize = logoContainerHeight;
    else logoSize = logoContainerWidth;
    if(logoSize > 420) logoSize = 420;
    var logoContainer = document.querySelector('.logoContainer');
    logoContainer.style.height = `${logoSize}px`;
    logoContainer.style.width = `${logoSize}px`;
    var horizontalOffset = (logoContainerWidth - logoSize) / 2;
    var verticalOffset = (logoContainerHeight - logoSize) / 2;
    var logoImage = document.querySelector('.logoImage');
    logoImage.style.paddingLeft = `${horizontalOffset}px`;
    logoImage.style.paddingTop = `${verticalOffset}px`;
}
window.onresize = adjustLogo;
