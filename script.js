(function(){
  "use strict";

  var DISCORD_ID = "1484976113255190733";

  /* ========== MUSIC ========== */
  (function(){
    var audio = document.getElementById('siteAudio');
    var btn = document.getElementById('musicBtn');
    if(!audio || !btn) return;

    audio.volume = 0.35;
    var savedTime = parseFloat(localStorage.getItem('kt_music_time') || '0');

    audio.addEventListener('loadedmetadata', function(){
      if(savedTime > 0 && savedTime < audio.duration - 3){
        audio.currentTime = savedTime;
      }
    }, { once: true });

    setTimeout(function(){ btn.classList.add('show'); }, 800);

    btn.addEventListener('click', function(){
      if(audio.paused){
        audio.play().then(function(){ btn.classList.add('playing'); }).catch(function(){});
      } else {
        audio.pause();
        btn.classList.remove('playing');
      }
    });

    setInterval(function(){
      if(!audio.paused && audio.currentTime > 0){
        localStorage.setItem('kt_music_time', audio.currentTime.toFixed(2));
      }
    }, 3000);

    window.addEventListener('beforeunload', function(){
      if(audio.currentTime > 0){
        localStorage.setItem('kt_music_time', audio.currentTime.toFixed(2));
      }
    });

    document.addEventListener('keydown', function(e){
      if(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if(e.key === 'm' || e.key === 'M'){ btn.click(); }
      if(e.code === 'Space'){ e.preventDefault(); btn.click(); }
    });
  })();

  /* ========== DISCORD LIVE ========== */
  var activityTypeLabel = {
    0:'playing a game',
    1:'streaming',
    2:'listening to spotify',
    3:'watching',
    4:'status',
    5:'competing in'
  };
  var statusMap = {online:'online',idle:'idle',dnd:'dnd',offline:'offline'};

  function avatarUrl(user){
    if(!user) return '';
    if(user.avatar){
      var ext = user.avatar.indexOf('a_') === 0 ? 'gif' : 'png';
      return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + ext + '?size=160';
    }
    var idx = (BigInt(user.id) >> 22n) % 6n;
    return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png';
  }

  function assetUrl(appId, asset){
    if(!appId || !asset) return '';
    if(asset.indexOf('mp:external/') === 0) return '';
    if(asset.indexOf('spotify:') === 0) return 'https://i.scdn.co/image/' + asset.replace('spotify:', '');
    return 'https://cdn.discordapp.com/app-assets/' + appId + '/' + asset + '.png';
  }

  function fmt(ms){
    var s = Math.floor(ms/1000);
    var m = Math.floor(s/60);
    var sec = s%60;
    return m + ':' + String(sec).padStart(2,'0');
  }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  var HEX_BADGE = '<svg viewBox="0 0 120 120" width="14" height="14" aria-hidden="true">' +
    '<path d="M32 10 L88 10 L118 60 L88 110 L32 110 L2 60 Z" fill="currentColor"/>' +
    '<path d="M40 42 L22 60 L40 78" stroke="#232428" stroke-width="9" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="M80 42 L98 60 L80 78" stroke="#232428" stroke-width="9" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="M68 32 L52 88" stroke="#232428" stroke-width="9" fill="none" stroke-linecap="round"/>' +
  '</svg>';

  function render(data){
    var mount = document.getElementById('dcMount');
    if(!mount) return;
    if(!data){
      mount.innerHTML = '<div class="dc-error">couldn\'t reach discord — try refreshing</div>';
      return;
    }

    var user = data.discord_user || {};
    var status = statusMap[data.discord_status] || 'offline';
    var acts = data.activities || [];
    var custom = null;
    var main = null;

    for(var i=0;i<acts.length;i++){
      var a = acts[i];
      if(a.type === 4){ custom = a; }
      else if(!main){ main = a; }
    }

    if(!main && data.listening_to_spotify && data.spotify){
      main = {
        type: 2,
        name: 'Spotify',
        details: data.spotify.song,
        state: data.spotify.artist,
        _sp: data.spotify
      };
    }

    var av = avatarUrl(user);
    var name = user.global_name || user.display_name || user.username || 'unknown';
    var handle = user.username || 'unknown';
    var nitro = user.avatar && user.avatar.indexOf('a_') === 0 ? '<span class="dc-nitro">nitro</span>' : '';

    var html = '';
    html += '<div class="dc-card">';

    // banner
    html += '  <div class="dc-banner"></div>';

    // avatar
    html += '  <div class="dc-head">';
    html += '    <div class="dc-av-wrap">';
    html += '      <img class="dc-av" src="' + av + '" alt="" onerror="this.style.display=\'none\'">';
    html += '      <span class="dc-status ' + status + '"></span>';
    html += '    </div>';
    html += '  </div>';

    // name + tag
    html += '  <div class="dc-user-info">';
    html += '    <div class="dc-name-row">';
    html += '      <span class="dc-display">' + esc(name) + '</span>';
    html += '      <span class="dc-tag">' + esc(handle) + '</span>';
    html += '    </div>';
    html += '  </div>';

    // badges
    html += '  <div class="dc-user-info">';
    html += '    <div class="dc-badges">';
    html += '      <span class="dc-badge-svg" title="Active Developer">' + HEX_BADGE + '</span>';
    html += '    </div>';
    html += '  </div>';

    // custom status
    if(custom){
      var emoji = '';
      if(custom.emoji){
        if(custom.emoji.id){
          emoji = '<img src="https://cdn.discordapp.com/emojis/' + custom.emoji.id + '.' + (custom.emoji.animated?'gif':'png') + '" alt="">';
        } else {
          emoji = '<span>' + (custom.emoji.name||'') + '</span>';
        }
      }
      html += '  <div class="dc-user-info">';
      html += '    <div class="dc-custom-status">' + emoji + '<span>' + esc(custom.state||'') + '</span></div>';
      html += '  </div>';
    }

    // bio lines
    html += '  <div class="dc-bio">';
    html += '    <div class="dc-bio-line"><a href="https://nohello.net" target="_blank" rel="noopener">https://nohello.net/</a></div>';
    html += '    <div class="dc-bio-line">Don\'t DM For development issues</div>';
    html += '    <div class="dc-bio-line"><a href="https://discord.gg/qFXsGMWWZ" target="_blank" rel="noopener">https://discord.gg/qFXsGMWWZ…</a></div>';
    html += '  </div>';

    // activity
    if(main){
      html += '  <div class="dc-activity">';
      html += '    <div class="dc-act-label">' + (activityTypeLabel[main.type] || 'activity') + '</div>';
      html += '    <div class="dc-act-body">';

      var img = '';
      if(main._sp){
        img = main._sp.album_art_url || '';
      } else if(main.assets){
        img = assetUrl(main.application_id, main.assets.large_image);
      }
      if(img){
        html += '<img class="dc-act-img" src="' + img + '" alt="" onerror="this.style.background=\'#1e1f22\';this.removeAttribute(\'src\')">';
      } else {
        html += '<div class="dc-act-img"></div>';
      }

      html += '      <div class="dc-act-info">';
      html += '        <div class="dc-act-name">' + esc(main.name||'') + '</div>';
      if(main.details) html += '<div class="dc-act-detail">' + esc(main.details) + '</div>';

      if(main._sp){
        var sp = main._sp;
        var now = sp.timestamps ? Date.now() : 0;
        var s0 = sp.timestamps ? sp.timestamps.start : 0;
        var e0 = sp.timestamps ? sp.timestamps.end : 0;
        var total = e0 - s0;
        var elapsed = Math.max(0, Math.min(total, now - s0));
        var pct = total > 0 ? (elapsed/total)*100 : 0;
        html += '<div class="dc-act-detail" style="margin-top:2px">' + esc(sp.artist||'') + '</div>';
        html += '<div class="dc-spotify-bar"><div class="dc-spotify-fill" data-pct="' + pct + '" data-start="' + s0 + '" data-end="' + e0 + '"></div></div>';
        html += '<div class="dc-spotify-times"><span data-cur>' + fmt(elapsed) + '</span><span>' + fmt(total) + '</span></div>';
      } else if(main.timestamps && main.timestamps.start){
        var el2 = Date.now() - main.timestamps.start;
        html += '        <div class="dc-act-meta"><span>' + fmt(el2) + ' elapsed</span></div>';
      }

      html += '      </div>';
      html += '    </div>';
      html += '  </div>';
    }

    // bottom — verified pill + links + join button
    html += '  <div class="dc-bottom">';
    html += '    <div class="dc-verified-pill">';
    html += '      <span class="dc-vp-badge">' + HEX_BADGE + '</span>';
    html += '      <span class="dc-vp-text">Active Developer</span>';
    html += '      <span class="dc-vp-sep">·</span>';
    html += '      <span class="dc-vp-sub">@KettehDev</span>';
    html += '    </div>';

    html += '    <div class="dc-links">';
    html += '      <a class="dc-link" href="https://nohello.net" target="_blank" rel="noopener">read nohello.net before dming</a>';
    html += '      <a class="dc-link warn" href="#">don\'t dm for dev issues</a>';
    html += '    </div>';

    html += '    <a class="dc-join" href="https://discord.gg/qFXsGMWWZ" target="_blank" rel="noopener">';
    html += '      join discord';
    html += '      <span class="dc-join-hint">for anything else</span>';
    html += '    </a>';
    html += '  </div>';

    html += '</div>';

    mount.innerHTML = html;

    mount.querySelectorAll('.dc-spotify-fill').forEach(function(f){
      f.style.width = f.getAttribute('data-pct') + '%';
    });

    if(main && main._sp) startSpotifyTick();
  }

  var spotifyInt = null;
  function startSpotifyTick(){
    if(spotifyInt) clearInterval(spotifyInt);
    spotifyInt = setInterval(function(){
      var fill = document.querySelector('.dc-spotify-fill');
      var timeEl = document.querySelector('[data-cur]');
      if(!fill){ clearInterval(spotifyInt); return; }
      var s0 = parseInt(fill.getAttribute('data-start'), 10);
      var e0 = parseInt(fill.getAttribute('data-end'), 10);
      var total = e0 - s0;
      var elapsed = Math.max(0, Math.min(total, Date.now() - s0));
      var pct = total > 0 ? (elapsed/total)*100 : 0;
      fill.style.width = pct + '%';
      if(timeEl) timeEl.textContent = fmt(elapsed);
    }, 1000);
  }

  function fetchLanyard(){
    fetch('https://api.lanyard.rest/v1/users/' + DISCORD_ID, { cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(j){
        render(j && j.success && j.data ? j.data : null);
      })
      .catch(function(){ render(null); });
  }
  fetchLanyard();
  setInterval(fetchLanyard, 15000);

  /* ========== CONSOLE ========== */
  console.log('%c ketteh ','background:#5865f2;color:#fff;font-weight:700;padding:3px 8px;border-radius:3px;');
})();
