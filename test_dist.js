
function getDistance(lat1, lng1, lat2, lng2) {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const lat_user = 25.018159028297426;
const lng_user = 121.46634270203434;

const lat_center = 25.018192545497477;
const lng_center = 121.46634364694073;

const dist = getDistance(lat_user, lng_user, lat_center, lng_center);
console.log("Distance:", dist, "meters");
