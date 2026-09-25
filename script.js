(function(){
  "use strict";

  var DISCORD_ID = "1484976113255190733";

  /* ========== SPOTLIGHT FOLLOWS CURSOR ========== */
  var spotlight = document.getElementById('spotlight');
  if(spotlight){
    var sx = 0, sy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', function(e){
      tx = e.clientX;
      ty = e.clientY;
    });
    (function loop(){
      sx += (tx - sx) * 0.06;
      sy += (ty - sy) * 0.06;
      spotlight.style.left = sx + 'px';
      spotlight.style.top = sy + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ========== CLOCK ========== */
  var clock = document.getElementById('clock');
  function tick(){
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    if(clock) clock.textContent = h + ':' + m + ':' + s;
  }
  tick();
  setInterval(tick, 1000);

  /* ========== LETTER SPLIT ANIMATION ========== */
  var splitEls = document.querySelectorAll('[data-split]');
  splitEls.forEach(function(el){
    var text = el.textContent;
    el.innerHTML = '';
    for(var i = 0; i < text.length; i++){
      var ch = text[i];
      var span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(60%) rotate(6deg)';
      span.style.transition = 'opacity .8s cubic-bezier(.2,.9,.3,1), transform .8s cubic-bezier(.2,.9,.3,1)';
      span.style.transitionDelay = (i * 0.03) + 's';
      el.appendChild(span);
      (function(sp){
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            sp.style.opacity = '1';
            sp.style.transform = 'none';
          });
        });
      })(span);
    }
  });

  /* ========== SCROLL REVEAL ========== */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.live-card, .work, .about-text p, .about-spec, .contact-big, .contact-sm, .sec-head').forEach(function(el){
    el.classList.add('reveal');
    io.observe(el);
  });

  /* ========== TOP NAV ACTIVE STATE ON SCROLL ========== */
  var navLinks = document.querySelectorAll('#topMid a[data-scroll]');
  var sections = ['work', 'about', 'contact'].map(function(id){ return document.getElementById(id); });
  function updateNav(){
    var mid = window.scrollY + window.innerHeight * 0.35;
    var active = null;
    sections.forEach(function(sec){
      if(sec && sec.offsetTop <= mid) active = sec.id;
    });
    navLinks.forEach(function(a){
      a.classList.toggle('active', a.getAttribute('href') === '#' + active);
    });
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ========== SMOOTH SCROLL FOR data-scroll ========== */
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[data-scroll]');
    if(!a) return;
    var href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      var target = document.querySelector(href);
      if(target){
        var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }
  });

  /* ========== WORK ITEM TILT ========== */
  document.querySelectorAll('.work').forEach(function(item){
    item.addEventListener('mousemove', function(e){
      var r = item.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      var title = item.querySelector('.w-title');
      if(title){
        title.style.transform = 'translate(' + (x * 8) + 'px, ' + (y * 4) + 'px)';
      }
    });
    item.addEventListener('mouseleave', function(){
      var title = item.querySelector('.w-title');
      if(title) title.style.transform = '';
    });
  });

  /* ========== DISCORD LIVE ========== */
  var activityTypeLabel = { 0:'playing', 1:'streaming', 2:'listening to', 3:'watching', 4:'custom', 5:'competing in' };
  var statusMap = { online:'online', idle:'idle', dnd:'dnd', offline:'offline' };

  function discordAvatarUrl(user){
    if(!user) return '';
    if(user.avatar){
      var ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
      return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + ext + '?size=128';
    }
    var idx = (BigInt(user.id) >> 22n) % 6n;
    return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png';
  }

  function activityAssetUrl(appId, assetId){
    if(!appId || !assetId) return '';
    if(assetId.startsWith('mp:external/')) return '';
    if(assetId.startsWith('spotify:')) return 'https://i.scdn.co/image/' + assetId.replace('spotify:', '');
    return 'https://cdn.discordapp.com/app-assets/' + appId + '/' + assetId + '.png';
  }

  function fmtTime(ms){
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + String(sec).padStart(2, '0');
  }

  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function renderDiscord(data){
    var content = document.getElementById('dcContent');
    if(!content) return;
    if(!data){
      content.innerHTML = '<div class="dc-error">could not reach discord api</div>';
      return;
    }

    var user = data.discord_user || {};
    var status = statusMap[data.discord_status] || 'offline';
    var activities = data.activities || [];
    var customStatus = null;
    var mainActivity = null;

    for(var i = 0; i < activities.length; i++){
      var a = activities[i];
      if(a.type === 4){ customStatus = a; }
      else if(!mainActivity && a.type !== 4){ mainActivity = a; }
    }

    if(!mainActivity && data.listening_to_spotify && data.spotify){
      mainActivity = {
        type: 2, name: 'Spotify',
        details: data.spotify.song, state: data.spotify.artist,
        _isSpotify: true, _spotify: data.spotify
      };
    }

    var avUrl = discordAvatarUrl(user);
    var displayName = user.global_name || user.display_name || user.username || 'unknown';
    var username = user.username || 'unknown';
    var nitroBadge = user.avatar && user.avatar.startsWith('a_') ? '<span class="dc-nitro">nitro</span>' : '';

    var html = '';
    html += '<div class="dc-user">';
    html += '  <div class="dc-avatar-wrap">';
    html += '    <img class="dc-avatar" src="' + avUrl + '" alt="" onerror="this.style.display=\'none\'">';
    html += '    <span class="dc-status-dot ' + status + '"></span>';
    html += '  </div>';
    html += '  <div class="dc-info">';
    html += '    <div class="dc-display">' + escapeHtml(displayName) + nitroBadge + '</div>';
    html += '    <div class="dc-username">@' + escapeHtml(username) + '</div>';
    if(customStatus){
      var emoji = '';
      if(customStatus.emoji){
        if(customStatus.emoji.id){
          emoji = '<img src="https://cdn.discordapp.com/emojis/' + customStatus.emoji.id + '.' + (customStatus.emoji.animated ? 'gif' : 'png') + '" alt="">';
        } else {
          emoji = '<span>' + (customStatus.emoji.name || '') + '</span>';
        }
      }
      html += '    <div class="dc-custom">' + emoji + '<span>' + escapeHtml(customStatus.state || '') + '</span></div>';
    }
    html += '  </div>';
    html += '</div>';

    if(mainActivity){
      var typeLabel = activityTypeLabel[mainActivity.type] || 'activity';
      html += '<div class="dc-activity">';
      var imgUrl = '';
      if(mainActivity._isSpotify){
        imgUrl = mainActivity._spotify.album_art_url || '';
      } else if(mainActivity.assets){
        imgUrl = activityAssetUrl(mainActivity.application_id, mainActivity.assets.large_image);
      }
      if(imgUrl){
        html += '<img class="dc-act-img" src="' + imgUrl + '" alt="" onerror="this.style.background=\'#131320\';this.removeAttribute(\'src\')">';
      } else {
        html += '<div class="dc-act-img"></div>';
      }
      html += '<div class="dc-act-info">';
      html += '<div class="dc-act-label">' + typeLabel + '</div>';
      html += '<div class="dc-act-name">' + escapeHtml(mainActivity.name || '') + '</div>';
      if(mainActivity.details) html += '<div class="dc-act-detail">' + escapeHtml(mainActivity.details) + '</div>';
      if(mainActivity._isSpotify){
        var sp = mainActivity._spotify;
        var now = sp.timestamps ? Date.now() : 0;
        var start = sp.timestamps ? sp.timestamps.start : 0;
        var end = sp.timestamps ? sp.timestamps.end : 0;
        var total = end - start;
        var elapsed = Math.max(0, Math.min(total, now - start));
        var pct = total > 0 ? (elapsed / total) * 100 : 0;
        html += '<div class="dc-spotify-bar"><div class="dc-spotify-fill" data-pct="' + pct + '" data-start="' + start + '" data-end="' + end + '"></div></div>';
        html += '<div class="dc-spotify-times"><span data-cur>' + fmtTime(elapsed) + '</span><span>' + fmtTime(total) + '</span></div>';
      } else if(mainActivity.timestamps && mainActivity.timestamps.start){
        var elapsed2 = Date.now() - mainActivity.timestamps.start;
        html += '<div class="dc-act-time">' + fmtTime(elapsed2) + ' elapsed</div>';
      }
      html += '</div></div>';
    } else {
      html += '<div class="dc-idle">no activity right now</div>';
    }

    content.innerHTML = html;

    content.querySelectorAll('.dc-spotify-fill').forEach(function(fill){
      fill.style.width = fill.getAttribute('data-pct') + '%';
    });

    if(mainActivity && mainActivity._isSpotify){ startSpotifyTick(); }
  }

  var spotifyInterval = null;
  function startSpotifyTick(){
    if(spotifyInterval) clearInterval(spotifyInterval);
    spotifyInterval = setInterval(function(){
      var fill = document.querySelector('.dc-spotify-fill');
      var timeEl = document.querySelector('[data-cur]');
      if(!fill){ clearInterval(spotifyInterval); return; }
      var start = parseInt(fill.getAttribute('data-start'), 10);
      var end = parseInt(fill.getAttribute('data-end'), 10);
      var total = end - start;
      var elapsed = Math.max(0, Math.min(total, Date.now() - start));
      var pct = total > 0 ? (elapsed / total) * 100 : 0;
      fill.style.width = pct + '%';
      if(timeEl) timeEl.textContent = fmtTime(elapsed);
    }, 1000);
  }

  function fetchDiscord(){
    fetch('https://api.lanyard.rest/v1/users/' + DISCORD_ID, { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(json){
        renderDiscord(json && json.success && json.data ? json.data : null);
      })
      .catch(function(){ renderDiscord(null); });
  }
  fetchDiscord();
  setInterval(fetchDiscord, 15000);

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

    setTimeout(function(){ btn.classList.add('show'); }, 900);

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

  /* ========== KONAMI ========== */
  var konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var ki = 0;
  document.addEventListener('keydown', function(e){
    if(e.key === konami[ki]){
      ki++;
      if(ki === konami.length){
        ki = 0;
        document.documentElement.style.transition = 'filter .8s';
        document.documentElement.style.filter = 'hue-rotate(180deg)';
        setTimeout(function(){
          document.documentElement.style.filter = 'hue-rotate(360deg)';
          setTimeout(function(){ document.documentElement.style.filter = ''; }, 800);
        }, 100);
      }
    } else { ki = 0; }
  });

  console.log(
    '%c ketteh ',
    'background:#d6ff3d; color:#07070a; font-weight:800; padding:4px 10px; border-radius:4px; letter-spacing:-0.02em;'
  );
  console.log(
    '%c built by hand · actually no AI',
    'color:#5a5a70; font-style:italic;'
  );

})();
