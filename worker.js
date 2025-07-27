addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Serve HTML
  if (url.pathname === "/") {
    return new Response(HTML_CONTENT, {
      headers: { 
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }

  // Serve CSS
  if (url.pathname === "/style.css") {
    return new Response(CSS_CONTENT, {
      headers: { 
        "Content-Type": "text/css",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Serve JS
  if (url.pathname === "/script.js") {
    return new Response(JS_CONTENT, {
      headers: { 
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // API download
  if (url.pathname === "/download") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) return new Response("URL required", { status: 400 });
    
    try {
      const result = await extractMedia(targetUrl);
      return new Response(JSON.stringify(result), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  
  return new Response("Not found", { status: 404 });
}

async function extractMedia(url) {
  const hostname = new URL(url).hostname;
  
  // YouTube
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)[1];
    
    // Gunakan API publik YouTube
    const apiUrl = `https://yt.lemnoslife.com/noKey/videos?part=contentDetails&id=${videoId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) throw new Error("Video tidak ditemukan");
    
    const videoDetails = data.items[0];
    const duration = videoDetails.contentDetails.duration;
    
    return {
      title: "YouTube Video",
      type: "video",
      sources: [
        { 
          quality: "HD", 
          url: `https://www.youtube.com/watch?v=${videoId}`,
          download: `https://youtubepi.herokuapp.com/dl?id=${videoId}`
        }
      ],
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      meta: {
        duration,
        platform: "YouTube"
      }
    };
  }
  
  // Instagram
  if (hostname.includes("instagram.com")) {
    const shortcode = url.split("/p/")[1].split("/")[0];
    
    // Gunakan API publik Instagram
    const apiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    const media = data.graphql.shortcode_media;
    const isVideo = media.is_video;
    const mediaUrl = isVideo ? media.video_url : media.display_url;
    
    return {
      title: media.owner.username,
      type: isVideo ? "video" : "image",
      sources: [
        { 
          quality: "Original", 
          url: mediaUrl,
          download: mediaUrl
        }
      ],
      thumbnail: media.display_url,
      meta: {
        likes: media.edge_media_preview_like.count,
        comments: media.edge_media_to_comment.count,
        platform: "Instagram"
      }
    };
  }
  
  // Twitter
  if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
    const statusId = url.split("/status/")[1].split("?")[0];
    
    // Gunakan API publik Twitter
    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${statusId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    const media = data.mediaDetails?.[0];
    if (!media) throw new Error("Media tidak ditemukan");
    
    const mediaUrl = media.type === "video" ? 
      media.video_info.variants[0].url : 
      media.media_url_https;
    
    return {
      title: data.user.name,
      type: media.type,
      sources: [
        { 
          quality: "HD", 
          url: mediaUrl,
          download: mediaUrl
        }
      ],
      thumbnail: media.media_url_https,
      meta: {
        retweets: data.conversation_count,
        likes: data.favorite_count,
        platform: "Twitter"
      }
    };
  }
  
  // Facebook
  if (hostname.includes("facebook.com")) {
    // Gunakan teknik direct parsing
    const response = await fetch(url);
    const html = await response.text();
    
    // Cari video URL
    const videoMatch = html.match(/"browser_native_hd_url":"([^"]+)"/) || 
                      html.match(/"browser_native_sd_url":"([^"]+)"/);
    
    if (!videoMatch) throw new Error("Video tidak ditemukan");
    
    const videoUrl = JSON.parse(`"${videoMatch[1]}"`);
    
    // Cari thumbnail
    const thumbMatch = html.match(/"preferred_thumbnail":{"image":{"uri":"([^"]+)"/);
    const thumbnail = thumbMatch ? JSON.parse(`"${thumbMatch[1]}"`) : "";
    
    // Cari judul
    const titleMatch = html.match(/"name":"([^"]+)"/);
    const title = titleMatch ? JSON.parse(`"${titleMatch[1]}"`) : "Facebook Video";
    
    return {
      title,
      type: "video",
      sources: [
        { 
          quality: "HD", 
          url: videoUrl,
          download: videoUrl
        }
      ],
      thumbnail,
      meta: {
        platform: "Facebook"
      }
    };
  }
  
  // TikTok
  if (hostname.includes("tiktok.com")) {
    const videoId = url.match(/video\/(\d+)/)?.[1] || 
                   url.match(/@[^/]+\/video\/(\d+)/)?.[1];
    
    if (!videoId) throw new Error("ID video TikTok tidak ditemukan");
    
    // Gunakan API publik TikTok
    const apiUrl = `https://api.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    const videoData = data.aweme_list?.[0];
    if (!videoData) throw new Error("Video TikTok tidak ditemukan");
    
    const videoUrl = videoData.video.play_addr.url_list[0];
    const musicUrl = videoData.music.play_url.url_list[0];
    
    return {
      title: videoData.desc,
      type: "video",
      sources: [
        { 
          quality: "Video HD", 
          url: videoUrl,
          download: videoUrl
        },
        { 
          quality: "Audio", 
          url: musicUrl,
          download: musicUrl
        }
      ],
      thumbnail: videoData.video.cover.url_list[0],
      meta: {
        likes: videoData.statistics.digg_count,
        comments: videoData.statistics.comment_count,
        platform: "TikTok"
      }
    };
  }
  
  throw new Error("Platform tidak didukung");
}

// Frontend content constants
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media Downloader</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⬇️</text></svg>">
</head>
<body>
    <!-- Content will be loaded from index.html -->
</body>
<script src="/script.js"></script>
</html>`;

const CSS_CONTENT = `
/* CSS content will be loaded from style.css */`;

const JS_CONTENT = `
// JS content will be loaded from script.js`;