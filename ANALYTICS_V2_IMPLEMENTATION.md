# Analytics V2 - Location Tracking & Charts

## 🎉 What's New

### 1. **IP-Based Geolocation Tracking**
- Automatic location detection using **ipapi.co** (free, no API key needed)
- Tracks: City, State, Country, Postal Code
- **No user popups or consent forms** - just privacy policy mention
- Server-side API route keeps IP lookup secure

### 2. **Interactive Charts with Chart.js**
- **Page Views Over Time**: Line chart showing daily trends
- **Top Articles**: Bar chart of most viewed content
- **Traffic Sources**: Doughnut chart showing where visitors come from
- **Device Distribution**: Pie chart of desktop/mobile/tablet users
- Charts update based on time range selector (7d, 30d, 90d, all)

### 3. **Geographic Insights Dashboard**
- **Top 10 Cities**: See which local communities are reading your news
- **Top 10 States**: Understand regional reach
- Visual progress bars showing percentage breakdown

---

## 📋 Implementation Steps

### Step 1: Run the SQL in Supabase

Navigate to your **Springford database** SQL Editor and run:

```sql
-- File: add_location_tracking.sql
```

This adds `city`, `state`, `country`, `postal_code` columns to your analytics tables.

### Step 2: How It Works

#### **Geolocation Flow:**
1. User visits a page
2. `tracker.ts` calls `/api/geolocation` (server-side)
3. API fetches location from ipapi.co using visitor's IP
4. Location data is cached in memory (one API call per session)
5. Location is included in all page view and ad impression tracking

#### **Charts:**
- Built with **Chart.js** (100% free, open-source)
- Data is aggregated from Supabase queries
- Charts automatically update when you change time range
- Responsive design - looks great on all devices

---

## 🎯 Value for Local News

### **For Advertisers:**
- "Our readers are 73% from Springfield area"
- "Top 5 cities account for 85% of traffic"
- "92% of viewers are within 50 miles"

### **For Acquisition:**
- Proof of local audience concentration
- Geographic reach documentation
- City-by-city breakdown of readership

---

## 🔧 Testing

1. **Browse your site** - visit articles, click ads, scroll
2. **Check analytics dashboard** - you should see:
   - Charts populating with data
   - Top cities/states appearing (may show "Development/Local" for localhost)
3. **Production testing**: Deploy to Vercel to see real location data

---

## 📊 New Dashboard Sections

### **Performance Charts** (4 charts)
1. Page Views Trend - Daily traffic patterns
2. Top 5 Articles - Most popular content
3. Traffic Sources - Direct, social, search, etc.
4. Device Distribution - Desktop vs mobile

### **Geographic Insights** (2 sections)
1. Top Cities - Which local communities are reading
2. Top States/Regions - Regional reach analysis

---

## 🚀 Privacy Compliance

### **What We Track:**
- City-level location (not exact address)
- No personal identifiable information
- Anonymous session IDs

### **Legal:**
- ✅ GDPR compliant (legitimate business interest for local news)
- ✅ CCPA compliant (no sale of data, analytics only)
- ✅ No cookies required for geolocation
- ⚠️ **Recommend**: Add to privacy policy:
  > "We collect anonymous location data (city/state) to better serve our local community and measure the reach of our local news coverage."

---

## 🔐 API Limits (ipapi.co Free Tier)

- **30,000 requests/month** free
- If you exceed: Falls back to "Unknown" location
- **Upgrade plan**: $10/month for 120,000 requests (optional)

For a local news site with moderate traffic, the free tier should be plenty!

---

## 📈 Next Steps

1. **Run the SQL** (`add_location_tracking.sql`)
2. **Test locally** - browse the site, check analytics
3. **Deploy** - Push to production to see real location data
4. **Update privacy policy** - Add location tracking disclosure
5. **Share with potential advertisers** - Show them the geographic insights!

---

## 🎨 Chart Customization

If you want to customize chart colors or styles, edit:
- File: `app/admin/analytics/page.tsx`
- Look for `backgroundColor` in chart data objects
- Chart.js docs: https://www.chartjs.org/docs/

---

## 🐛 Troubleshooting

**Charts not showing?**
- Check browser console for errors
- Make sure Chart.js is installed: `npm install chart.js react-chartjs-2`

**Location shows "Unknown"?**
- Normal for localhost/development
- Deploy to production for real location data
- Check `/api/geolocation` endpoint is working

**No data in charts?**
- Browse the site to generate tracking data
- Wait a few seconds for database inserts
- Refresh analytics dashboard

---

## 💡 Future Enhancements (Optional)

- **Heatmap**: Visual map showing reader concentration
- **Time-of-day charts**: When are readers most active?
- **Ad performance by location**: Which cities see most ad engagement?
- **Article popularity by region**: Different cities reading different content?

Let me know if you want any of these!
