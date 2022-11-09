// UTILS

function dateLong(date) {
    var opt = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric"
    };
    //return (new Date(date)).toLocaleDateString('en', opt);
    return new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

function parseText(txt) {
    txt = txt.replace('\n','<br>');
    return txt;
}

module.exports = {
    dateLong,
    parseText
}