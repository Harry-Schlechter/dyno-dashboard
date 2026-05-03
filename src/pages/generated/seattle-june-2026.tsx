import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Paper, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { AirplaneTicket, DirectionsCar, Hotel, LocationOn, LocalDining, Hiking, CheckCircle, Warning, TrendingUp, AttachMoney } from '@mui/icons-material';

const SeattleJune2026: React.FC = () => {
  return (
    <Box sx={{ pb: 4 }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2d5016 0%, #1a3a0a 100%)',
          color: 'white',
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: '18px',
          mb: 4,
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.9 }}>
          🏔️ Adventure Trip
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, mb: 2 }}>
          Seattle & Pacific Northwest
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.95, mb: 1 }}>
          Harry + Sydney · June 12–18, 2026
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Mt. Rainier & Olympic National Parks • Hiking • Rafting • Fine Dining
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Booked" color="success" variant="outlined" sx={{ borderColor: 'white', color: 'white' }} />
          <Chip label="Adventure" variant="outlined" sx={{ borderColor: 'white', color: 'white' }} />
          <Chip label="National Parks" variant="outlined" sx={{ borderColor: 'white', color: 'white' }} />
          <Chip label="Hiking" variant="outlined" sx={{ borderColor: 'white', color: 'white' }} />
        </Box>
      </Box>

      {/* Bookings Section */}
      <Card sx={{ mb: 3, background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AirplaneTicket fontSize="small" /> Flights & Bookings
          </Typography>

          {/* Flights */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#5B8DEF' }}>
              ✈️ Outbound - Friday, June 12
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '2px solid #5B8DEF' }}>
              <Typography variant="body2">
                <strong>EWR 4:25pm → SEA 7:36pm</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                United Airlines UA 1741 | Boeing 737 MAX 9
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Confirmation: <strong>NHZHSF</strong>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#5B8DEF' }}>
              ✈️ Return - Thursday, June 18
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '2px solid #5B8DEF' }}>
              <Typography variant="body2">
                <strong>SEA 7:40am → EWR 4:01pm</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                United Airlines UA 1900 | Boeing 737 MAX 8
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Same confirmation: <strong>NHZHSF</strong>
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Rental Car */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DirectionsCar fontSize="small" /> Rental Car
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">
                <strong>Hertz Intermediate SUV</strong> • Reference: <strong>L5771583466</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Friday, June 12 @ 8:00pm → Thursday, June 18 @ 5:00am
              </Typography>
              <Typography variant="body2" color="text.secondary">
                SEA In-Terminal | 5 passengers, 3 bags, A/C, unlimited miles
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                Cost: <strong>$308.65</strong> (due at pickup)
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Lodging */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Hotel fontSize="small" /> Lodging (TO BOOK)
            </Typography>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Needs to be booked ASAP. Priority: Lake Crescent Lodge (books fast in summer).
            </Alert>
            <Box sx={{ pl: 2, mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Fri Jun 12:</strong> Near SEA (Hilton Seattle Airport or Hampton Inn)
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Sat Jun 13:</strong> Ashford area (Alexander's Country Inn)
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Sun–Mon Jun 14-15:</strong> Port Angeles (Lake Crescent Lodge or Port Angeles Inn) — ⭐ Priority
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Wed Jun 17:</strong> Seattle proper (Kimpton Palliser or The Edgewater)
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Day-by-Day Itinerary */}
      <Card sx={{ mb: 3, background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" /> Day-by-Day Itinerary
          </Typography>

          {[
            {
              day: 'Friday, June 12',
              title: 'Arrival Day',
              items: ['4:25pm: Depart EWR', '7:36pm: Arrive SEA', '8:00pm: Pick up Hertz SUV', '8:30pm: Check into hotel near Sea-Tac', 'Dinner: Easy local spot (long travel day)'],
            },
            {
              day: 'Saturday, June 13',
              title: 'Grandma Lunch + Mt. Rainier',
              items: ['11am: Early lunch with Sydney\'s grandma', '1:00pm: Depart for Mt. Rainier (1.5 hrs)', '2:30pm: Arrive Paradise — Visitor Center', '3pm: Comet Falls hike (3.6mi +1,286ft 2.5–3hrs) ⭐', '6:30pm: Dinner at Copper Creek Restaurant (Ashford)'],
            },
            {
              day: 'Sunday, June 14',
              title: 'Full Day at Mt. Rainier',
              items: ['8:00am: Skyline Trail Loop (5.7mi +1,700ft 4–6hrs) ⭐ Best Overall', '1:30pm: Lunch at Paradise Inn', '3:00pm: Drive toward Olympic Peninsula / Port Angeles', '5:30pm: Arrive Port Angeles, check in', 'Dinner: Kokopelli Grill or First Street Haven'],
            },
            {
              day: 'Monday, June 15',
              title: 'Olympic NP: Alpine + Rainforest',
              items: ['8:00am: Hurricane Hill Trail (3.2mi +700ft 2–3hrs)', '11:00am: Drive to Hoh Rainforest (1.5 hrs)', '1:30pm: Hall of Mosses (0.8mi easy 45min) ⭐ Must-Do', '2:30pm: Hoh River Trail (2–3mi out & back)', '5:00pm: Drive toward Sol Duc or Lake Crescent'],
            },
            {
              day: 'Tuesday, June 16',
              title: 'Olympic: Coastal + Hot Springs',
              items: ['Morning: Rialto Beach / Hole-in-the-Wall hike (3mi easy) OR Mount Storm King (4mi very strenuous)', 'Afternoon: Sol Duc Falls hike (1.8mi 45min)', 'Sol Duc Hot Springs Soak ($25pp) — Recovery after hiking', '4:00pm: Begin drive back to Seattle (~3.5 hrs)'],
            },
            {
              day: 'Wednesday, June 17',
              title: 'Seattle Adventure Day',
              items: ['Morning (pick one):', '  • Rafting: Skykomish River Class IV-V (Alpine Adventures ~$90pp)', '  • Rock Climbing: Exit 38 / Deception Crags (45min from Seattle)', 'Afternoon: Pike Place Market or Washington State Ferry to Bainbridge Island', 'Dinner: Il Nido, Canlis, or Seastar Raw Bar — Splurge Night! ⭐', '9pm: Pack up, early bedtime for morning flight'],
            },
            {
              day: 'Thursday, June 18',
              title: 'Departure',
              items: ['4:00am: Wake', '4:30am: Depart hotel', '5:00am: Drop Hertz SUV at SEA', '7:40am: UA 1900 departs SEA → EWR', '4:01pm: Arrive EWR'],
            },
          ].map((dayplan, idx) => (
            <Box key={idx} sx={{ mb: 2, p: 2, background: 'rgba(91, 141, 239, 0.08)', borderRadius: '8px', borderLeft: '4px solid #5B8DEF' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 0.5 }}>
                {dayplan.day}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {dayplan.title}
              </Typography>
              <List disablePadding>
                {dayplan.items.map((item, i) => (
                  <ListItem key={i} disableGutters sx={{ fontSize: '0.875rem', py: 0.25 }}>
                    <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Best Hikes */}
      <Card sx={{ mb: 3, background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Hiking fontSize="small" /> Best Hikes (Ranked)
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 1 }}>
              Mount Rainier
            </Typography>
            {[
              { rank: '1. Skyline Trail Loop ⭐', desc: '5.7mi loop +1,700ft 4–6hrs challenging | Glacier views, wildflowers, quintessential Rainier' },
              { rank: '2. Mount Fremont Lookout ⭐', desc: '6mi RT +1,236ft 2.5–5hrs | Historic fire lookout, panoramic views, fewer crowds' },
              { rank: '3. Comet Falls', desc: '3.6mi RT +1,286ft 2.5–3hrs | 301-ft waterfall, most impressive accessible falls' },
              { rank: '4. Burroughs Mountain Loop', desc: '9mi +1,994ft 5–7hrs | Closest to summit without climbing gear' },
              { rank: '5. Naches Peak Loop', desc: '3.5mi loop +600ft 2–3hrs | Late-June wildflowers, warm-up option' },
            ].map((hike, idx) => (
              <Box key={idx} sx={{ mb: 1.5, pl: 2, borderLeft: '2px solid rgba(91, 141, 239, 0.3)' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {hike.rank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {hike.desc}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 1 }}>
              Olympic National Park
            </Typography>
            {[
              { rank: '1. Klahhane Ridge to Mount Angeles ⭐', desc: '~7mi RT +2,200ft 4–6hrs strenuous | Best views in park, fun scramble summit' },
              { rank: '2. Hurricane Hill Trail ⭐', desc: '3.2mi RT +700ft 2–3hrs | 360° panoramas, wildflowers, deer' },
              { rank: '3. Hall of Mosses ⭐', desc: '0.8mi loop easy 45min | Must-Do: towering maples wrapped in moss' },
              { rank: '4. Hoh River Trail to Five Mile Island', desc: '10.6mi RT moderate flat | Deep old-growth Sitka spruce, elk habitat' },
              { rank: '5. Mount Storm King', desc: '~4mi RT +2,000ft 3–4hrs strenuous | Rope-assisted climb, spectacular views' },
              { rank: '6. Marymere Falls', desc: '1.7mi RT +500ft easy 1hr | 90-ft waterfall, combine with Storm King' },
              { rank: '7. Rialto Beach to Hole-in-the-Wall ⭐', desc: '~3mi RT flat easy | Sea stacks, tide pools, driftwood, dramatic rock arch' },
              { rank: '8. Sol Duc Falls', desc: '1.8mi RT +200ft easy 45min | Multi-tiered waterfall, hot springs next door' },
            ].map((hike, idx) => (
              <Box key={idx} sx={{ mb: 1.5, pl: 2, borderLeft: '2px solid rgba(91, 141, 239, 0.3)' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {hike.rank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {hike.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Activities */}
      <Card sx={{ mb: 3, background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            🎯 10 Additional Activities to Consider
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {[
              { title: '1. White Water Rafting', desc: 'Skykomish River (Class IV-V) | Alpine Adventures | ~$90pp | 1hr E Seattle', icon: '🚣' },
              { title: '2. White Water Rafting', desc: 'Green River Gorge (Class III) | Triad River Tours | Milder option', icon: '🚣' },
              { title: '3. Outdoor Rock Climbing', desc: 'Exit 38 / Deception Crags | 45min from Seattle | Sport routes 5.7–5.12', icon: '🧗' },
              { title: '4. Outdoor Climbing', desc: 'Leavenworth | 2.5hrs from Seattle | Granite castle crags', icon: '🧗' },
              { title: '5. Sol Duc Hot Springs', desc: 'Day use $25pp | Three pools inside Olympic NP | Incredible after hiking', icon: '♨️' },
              { title: '6. Sea Kayaking', desc: 'Puget Sound | Lake Union / Elliott Bay | Rent or guided tour', icon: '🛶' },
              { title: '7. Washington State Ferry', desc: 'Bainbridge Island | 35min crossing | Winslow main street lunch', icon: '⛴️' },
              { title: '8. Pike Place Market', desc: 'Fish toss, Athenian Seafood, Pike Place Chowder | Classic Seattle', icon: '🐟' },
              { title: '9. Camp Muir', desc: 'Rainier Summit (Extreme) | 8.5mi RT +4,600ft | Crampons required', icon: '⛏️' },
              { title: '10. Underground Seattle', desc: 'Pioneer Square guided tour | 1.5hrs | Good rainy day option | ~$30pp', icon: '🏛️' },
            ].map((activity, idx) => (
              <Box key={idx} sx={{ p: 1.5, background: 'rgba(91, 141, 239, 0.06)', borderRadius: '8px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {activity.icon} {activity.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {activity.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Restaurants */}
      <Card sx={{ mb: 3, background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalDining fontSize="small" /> Restaurants & Dining
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 1 }}>
              Seattle
            </Typography>
            {[
              'Il Nido (West Seattle) — Refined Italian, stellar pasta, Antipasti Hour 4–5pm Tue–Sat',
              'Canlis — Iconic fine dining, Cascade views, splurge worthy (⭐ Reserve ASAP)',
              'Seastar Restaurant & Raw Bar — Top-tier seafood, Spring 2026 Resy hit list',
              'El Camino (Fremont) — 30-year Mexican institution, best patio',
              'Sushi Nori — New 2026, excellent sushi',
              'Pike Place Chowder — For clam chowder, line is worth it',
              'Kakurenbo (CID) — New Japanese, nigiri feast',
            ].map((rest, idx) => (
              <Typography key={idx} variant="body2" sx={{ mb: 0.75 }}>
                • {rest}
              </Typography>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 1 }}>
              Near Mt. Rainier (Ashford Area)
            </Typography>
            {[
              'Copper Creek Restaurant — PNW food, right outside park, cozy',
              'Whittaker\'s Bunkhouse Bar & Grill — Casual, mountaineer crowd',
              'Paradise Inn Dining Room — Inside the park, breakfast/lunch, atmospheric',
            ].map((rest, idx) => (
              <Typography key={idx} variant="body2" sx={{ mb: 0.75 }}>
                • {rest}
              </Typography>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 1 }}>
              Near Olympic (Port Angeles / Sol Duc)
            </Typography>
            {[
              'Kokopelli Grill (Port Angeles) — Best dinner in area, local ingredients',
              'First Street Haven (Port Angeles) — Breakfast/lunch, great coffee',
              'Sol Duc Hot Springs Resort Dining — Casual, eat before/after the soak',
            ].map((rest, idx) => (
              <Typography key={idx} variant="body2" sx={{ mb: 0.75 }}>
                • {rest}
              </Typography>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Budget Summary */}
      <Card sx={{ mb: 3, background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoney fontSize="small" /> Budget Summary
          </Typography>

          <TableContainer component={Paper} sx={{ background: 'transparent', border: 'none' }}>
            <Table size="small">
              <TableBody>
                {[
                  { category: 'Flights', amount: '$1,253.60', status: 'PAID' },
                  { category: 'Rental Car', amount: '$308.65', status: 'Due at pickup' },
                  { category: 'Lodging (5 nights)', amount: '~$800–1,000', status: 'To book' },
                  { category: 'Activities/Parks', amount: '~$300–500', status: '' },
                  { category: 'Food', amount: '~$400–600', status: '' },
                  { category: 'Park Passes', amount: '$70', status: '' },
                ].map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1, px: 0, borderBottom: '1px solid rgba(91, 141, 239, 0.2)' }}>
                      {row.category}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1, px: 1, borderBottom: '1px solid rgba(91, 141, 239, 0.2)', fontWeight: 600 }}>
                      {row.amount}
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1, borderBottom: '1px solid rgba(91, 141, 239, 0.2)', fontSize: '0.8rem', color: '#5B8DEF' }}>
                      {row.status}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ background: 'rgba(91, 141, 239, 0.1)' }}>
                  <TableCell sx={{ py: 1.5, px: 0, fontWeight: 700 }}>
                    ESTIMATED TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5, px: 1, fontWeight: 700, color: '#5B8DEF' }}>
                    ~$2,900–3,700
                  </TableCell>
                  <TableCell sx={{ py: 1.5, px: 1 }} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 2 }}>
            💡 Get America the Beautiful pass ($80 covers both parks, saves $70 total)
          </Alert>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card sx={{ background: 'rgba(18, 24, 33, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(91, 141, 239, 0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            ✅ Action Items
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ff6b6b', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning fontSize="small" /> URGENT
            </Typography>
            {[
              'Book lodging (Fri Sea-Tac, Sat Ashford, Sun–Mon Port Angeles/Lake Crescent, Wed Seattle)',
              'Reserve Lake Crescent Lodge (books FAST in summer!)',
              'Reserve Canlis (needs 30+ days notice)',
              'Book Alpine Adventures rafting',
            ].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1.5, mb: 1, pl: 2 }}>
                <Warning sx={{ fontSize: '1rem', color: '#ff6b6b', mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body2">{item}</Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B8DEF', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp fontSize="small" /> TO DECIDE
            </Typography>
            {[
              'Storm King vs. Rialto Beach for Tuesday',
              'Rafting vs. outdoor climbing for Wednesday',
              'Check Sunrise Rd opening date (late June, snow dependent)',
            ].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1.5, mb: 1, pl: 2 }}>
                <CheckCircle sx={{ fontSize: '1rem', color: '#5B8DEF', mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body2">{item}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SeattleJune2026;
