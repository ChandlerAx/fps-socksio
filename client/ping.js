var servers = {
    de_root_1: { country: 'DE', host: 'http://localhost/', online: false }
}

async function get_ping(url) {
    try {
        const nt = performance.now();
        await fetch(url, { method: 'HEAD' });
        const et = performance.now();
        const ping = et - nt;
        return `${ping.toFixed(1) - 4} ms`;
    } catch (error) {
        console.error(`Error for ${url} -`, error);
        return 'N/A';
    }
}

setInterval(async () => {
    document.getElementsByClassName('server')[0].innerHTML = `Server DE-1 | ${await get_ping(servers.de_root_1.host)}`;
}, 1500);