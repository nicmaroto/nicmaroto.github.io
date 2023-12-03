//navigation bar animation

window.addEventListener('scroll', function () {
    var nav = document.querySelector('nav');
    if (window.scrollY > 0) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

//about me box tab bar

const items = document.querySelectorAll('.about_expand_item');

items.forEach(item => {
    item.addEventListener('click', function () {
        items.forEach(otherItem => {
            otherItem.style.backgroundColor = '';
        });

        item.style.backgroundColor = '#ffd700';
    });
});

//about me content toggle

const expandItems = document.querySelectorAll('.about_expand_item');
const contentBoxes = document.querySelectorAll('.content_box');
const expandBox = document.querySelector('.about_expand_box');

let currentContentIndex = 0;

contentBoxes[currentContentIndex].style.opacity = '1';

expandItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        const targetIndex = index;

        if (targetIndex !== currentContentIndex) {
            contentBoxes[currentContentIndex].style.opacity = '0';

            setTimeout(() => {
                contentBoxes[currentContentIndex].style.display = 'none';
                contentBoxes[targetIndex].style.display = 'block';

                void contentBoxes[targetIndex].offsetWidth;

                contentBoxes[targetIndex].style.opacity = '1';

                currentContentIndex = targetIndex;
            }, 300);
        }
    });
});

//timeline animation//

document.addEventListener('DOMContentLoaded', function () {
    var awardsSection = document.querySelector('.awards');
    var timeline = document.querySelector('.timeline');
    var certificationsSection = document.querySelector('.certifications');
    var animationTriggered = false;

    function checkAwardsSection() {
        var awardsRect = awardsSection.getBoundingClientRect();
        var offset = window.innerHeight * 0.8;
        if (awardsRect.top < offset && !animationTriggered) {
            document.querySelectorAll('.timeline_container').forEach(function(container) {
                container.classList.add('animate');
            });
            animationTriggered = true;
        }
    }

    window.addEventListener('scroll', checkAwardsSection);
    checkAwardsSection();

    //timeline animation for line in the middle//

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !animationTriggered) {
                timeline.classList.add('animate-line');
                animationTriggered = true;
            }
        });
    }, { threshold: 0.8 });

    observer.observe(awardsSection);

    const defaultSwitch = document.querySelector('.awards-switch[data-target="awards"]');
    defaultSwitch.classList.add('active');

    certificationsSection.style.display = 'none';

    const awardsSwitches = document.querySelectorAll('.awards-switch');
    const contentContainers = document.querySelectorAll('.timeline_container');

    awardsSwitches.forEach((switchItem, index) => {
        switchItem.addEventListener('click', () => {
            awardsSwitches.forEach((otherSwitch, otherIndex) => {
                if (otherIndex !== index) {
                    otherSwitch.classList.remove('active');
                }
            });

            switchItem.classList.add('active');

            if (switchItem.getAttribute('data-target') === 'awards') {
                timeline.style.display = 'block';
                certificationsSection.style.display = 'none';
            } else {
                timeline.style.display = 'none';
                certificationsSection.style.display = 'flex';
            }
        });
    });
});

//Made by Nicolas Maroto//