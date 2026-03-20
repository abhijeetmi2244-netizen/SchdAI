import random

def generate_clash_free_timetable(data):
    max_attempts = 1500
    divisions = data.get('divisions', [])
    days = data.get('working_days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    slots_per_day = int(data.get('slots', 8))
    subjects = data.get('subjects', [])
    break_slots = [int(b) for b in data.get('breaks', [])]
    blocked_slots = set((b['day'], int(b['slot'])) for b in data.get('blocked_slots', []))
    slot_names = data.get('slot_names', [f"Period {i}" for i in range(1, slots_per_day + 1)])

    if not divisions or not subjects: return {'error': 'Insufficient data to generate timetable.'}

    for attempt in range(max_attempts):
        schedule = {d: {s: {div['name']: {batch: None for batch in div['batches']} for div in divisions} for s in range(1, slots_per_day + 1)} for d in days}
        teacher_busy = {d: {s: set() for s in range(1, slots_per_day + 1)} for d in days}
        room_busy = {d: {s: set() for s in range(1, slots_per_day + 1)} for d in days}
        
        daily_tracker = {d: {div['name']: {b: {'theory': set(), 'lab': set()} for b in div['batches']} for div in divisions} for d in days}
        assigned_links = {} 
        
        success = True
        failed_reason = ''
        requirements = []

        for div in divisions:
            for sub in subjects:
                if div['name'] not in sub.get('target_divs', []): continue
                for _ in range(int(sub['lectures'])):
                    if sub['type'] == 'theory': requirements.append({'div': div, 'batch': 'ALL', 'sub': sub})
                    else:
                        for batch in div['batches']: requirements.append({'div': div, 'batch': batch, 'sub': sub})

        # Process hardest constraints first (long labs, fewest teachers)
        requirements.sort(key=lambda x: (-int(x['sub'].get('duration', 1)), len(x['sub']['teachers'])))

        for req in requirements:
            placed = False
            div_name = req['div']['name']
            batch_target = req['batch']
            sub = req['sub']
            duration = int(sub.get('duration', 1))
            link_key = (div_name, batch_target, sub['code']) 
            
            valid_start_slots = range(1, slots_per_day - duration + 2)
            
            # HORIZONTAL PACKING: Searches the same period across all days before moving to the next period.
            # This perfectly clusters "Free" periods at the end of the day.
            available_slots = []
            for s in valid_start_slots:
                shuffled_days = list(days)
                random.shuffle(shuffled_days)
                for d in shuffled_days:
                    if (d, s) not in blocked_slots:
                        available_slots.append((d, s))

            for day, start_slot in available_slots:
                # Prevent scheduling the same subject multiple times in a single day for a batch
                batches_to_check = req['div']['batches'] if batch_target == 'ALL' else [batch_target]
                already_today = False
                for b in batches_to_check:
                    if sub['code'] in daily_tracker[day][div_name][b][sub['type']]:
                        already_today = True; break
                if already_today: continue

                slots_needed = range(start_slot, start_slot + duration)
                is_slot_free = True
                
                for s in slots_needed:
                    if s in break_slots or (day, s) in blocked_slots:
                        is_slot_free = False; break
                    if batch_target == 'ALL':
                        if any(schedule[day][s][div_name][b] is not None for b in req['div']['batches']):
                            is_slot_free = False; break
                    else:
                        if schedule[day][s][div_name][batch_target] is not None:
                            is_slot_free = False; break

                if not is_slot_free: continue
                
                assigned_teacher = None
                assigned_room = None
                
                # FACULTY LOCK: If this batch already has a teacher for this subject, use them!
                if link_key in assigned_links:
                    candidate_teachers = [assigned_links[link_key]['teacher']]
                    candidate_rooms = [assigned_links[link_key]['room']]
                else:
                    candidate_teachers = list(sub['teachers'])
                    random.shuffle(candidate_teachers)
                    if sub['type'] == 'theory': candidate_rooms = [req['div']['room']]
                    else:
                        candidate_rooms = list(sub.get('rooms', ['Lab']))
                        random.shuffle(candidate_rooms)

                # Check teacher and room availability
                for r in candidate_rooms:
                    if all(r not in room_busy[day][s] for s in slots_needed):
                        for t in candidate_teachers:
                            if all(t not in teacher_busy[day][s] for s in slots_needed):
                                assigned_teacher = t; assigned_room = r; break
                    if assigned_teacher: break
                
                if assigned_teacher:
                    # Lock the teacher to the batch for future iterations
                    if link_key not in assigned_links: assigned_links[link_key] = {'teacher': assigned_teacher, 'room': assigned_room}
                    
                    for s in slots_needed:
                        class_data = {'code': sub['code'], 'teacher': assigned_teacher, 'type': sub['type'], 'room': assigned_room}
                        if batch_target == 'ALL':
                            for b in req['div']['batches']: schedule[day][s][div_name][b] = class_data
                        else: schedule[day][s][div_name][batch_target] = class_data
                        teacher_busy[day][s].add(assigned_teacher)
                        room_busy[day][s].add(assigned_room)
                    
                    for b in batches_to_check: daily_tracker[day][div_name][b][sub['type']].add(sub['code'])
                    placed = True
                    break
            
            if not placed:
                success = False
                failed_reason = f"Bottleneck Detected: Could not fit '{sub['code']}' for {div_name}. Teachers/Rooms are fully occupied."
                break
                
        if success:
            for d in days:
                for s in range(1, slots_per_day + 1):
                    for div in divisions:
                        for b in div['batches']:
                            if schedule[d][s][div['name']][b] is None:
                                if s in break_slots: schedule[d][s][div['name']][b] = {'code': 'BREAK', 'teacher': '-', 'type': 'Break', 'room': '-'}
                                elif (d, s) in blocked_slots: schedule[d][s][div['name']][b] = {'code': 'OFF', 'teacher': '-', 'type': 'Blocked', 'room': '-'}
                                else: schedule[d][s][div['name']][b] = {'code': 'Free', 'teacher': '-', 'type': 'Activity', 'room': '-'}
            return {'schedule': schedule, 'divisions': divisions, 'days': days, 'slots': slots_per_day, 'breaks': break_slots, 'slot_names': slot_names}

    return {'error': failed_reason}
