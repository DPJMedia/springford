# Article Placements Feature

## Overview

A new "Article Placements" tab in the Article Management section allows admins to control which articles appear in special homepage sections like "Editor's Picks" and "Most Read".

## Features Implemented

### 1. New "Article Placements" Tab

**Location**: Admin Dashboard → Article Management → Article Placements tab

**Access**: Available alongside All, Published, Drafts, and Scheduled tabs

### 2. Editor's Picks Management

**Purpose**: Curate up to 3 articles to feature in the homepage sidebar

**Features**:
- Select from dropdown of all published articles
- 3 slots available (#1, #2, #3)
- Remove button for each slot
- Save button to persist selections
- Articles appear in the blue gradient "Editor's Picks" section on homepage

**How It Works**:
1. Go to Article Management → Article Placements
2. Select up to 3 published articles from the dropdowns
3. Click "Save Editor's Picks"
4. Selected articles immediately appear on the homepage

**Storage**: Saved in browser localStorage (persists across sessions)

### 3. Most Read Management

**Purpose**: View and manage the top 5 most-read articles

**Features**:
- Automatically displays top 5 articles by view count
- Shows article title and view count
- "Hide" button to remove articles from the list
- "Reset Hidden Articles" button to restore all hidden articles
- Hidden articles are excluded from the Most Read section on homepage

**How It Works**:
1. View the automatically-generated top 5 list
2. Click "Hide" on any article you want to remove
3. The next highest-viewed article takes its place
4. Click "Reset Hidden Articles" to clear all overrides

**Storage**: Hidden article IDs saved in browser localStorage

### 4. Removed "Allow Comments" Option

**Removed From**:
- New Article page (Article Options section)
- Edit Article page (Article Options section)

**Reason**: Feature not needed at this time

## Technical Details

### Data Storage

**Editor's Picks**:
- Key: `editorsPicks`
- Format: `["article-id-1", "article-id-2", "article-id-3"]`
- Location: Browser localStorage

**Most Read Overrides**:
- Key: `mostReadOverrides`
- Format: `["hidden-article-id-1", "hidden-article-id-2"]`
- Location: Browser localStorage

### Homepage Integration

**Editor's Picks Section**:
- Fetches article IDs from localStorage
- Queries Supabase for full article data
- Maintains order from saved selections
- Falls back to featured articles if no picks saved
- Displays in blue gradient box with star icon

**Most Read Section**:
- Queries all published articles
- Sorts by view_count (descending)
- Filters out hidden article IDs
- Takes top 5 remaining articles
- Shows view count for each article

## Usage Guide

### Setting Up Editor's Picks

1. **Navigate**: Admin Dashboard → Article Management
2. **Click**: "Article Placements" tab (purple button)
3. **Select Articles**:
   - Slot #1: Choose from dropdown
   - Slot #2: Choose from dropdown
   - Slot #3: Choose from dropdown
4. **Save**: Click "Save Editor's Picks"
5. **Verify**: Visit homepage to see your selections

### Managing Most Read

1. **Navigate**: Admin Dashboard → Article Management → Article Placements
2. **Review**: See current top 5 articles
3. **Hide Articles** (optional):
   - Click "Hide" next to any article
   - Confirm the action
   - Article is removed from homepage
4. **Reset** (if needed):
   - Click "Reset Hidden Articles"
   - All hidden articles are restored

### Tips

- **Editor's Picks**: Choose diverse, high-quality articles that represent your best content
- **Most Read**: Use the hide feature sparingly - let popularity drive the list naturally
- **Empty Slots**: It's okay to leave Editor's Picks slots empty if you have fewer than 3 articles
- **Updates**: Changes take effect immediately on the homepage

## Benefits

### For Admins
- **Editorial Control**: Curate homepage content beyond algorithms
- **Flexibility**: Quickly promote important stories
- **Override Capability**: Hide articles from Most Read if needed
- **Easy Management**: Simple dropdown interface

### For Readers
- **Quality Content**: Editor's Picks highlight best journalism
- **Popular Content**: Most Read shows what others are reading
- **Variety**: Two different discovery methods (curated + algorithmic)

## Future Enhancements (Optional)

- **Database Storage**: Move from localStorage to database for multi-admin support
- **Scheduling**: Schedule Editor's Picks to change automatically
- **Analytics**: Track clicks on Editor's Picks vs Most Read
- **More Sections**: Add more curated sections (e.g., "Don't Miss", "Staff Favorites")
- **Drag & Drop**: Reorder Editor's Picks with drag-and-drop interface

