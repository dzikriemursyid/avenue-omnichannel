1.  Alur Kerja (Flow) Sederhana
    User mengirim pesan ke WhatsApp bisnis Anda.
    Twilio menerima pesan dan mengirimkan webhook (HTTP POST) ke endpoint backend Anda.
    Backend Anda:
    Menerima payload webhook.
    Menyimpan pesan ke database (chat history).
    (Opsional) Menjalankan logic (misal: auto-reply, routing ke agent, dsb).
    Mengirim balasan ke user via Twilio API.
    User menerima balasan di WhatsApp.

2.  Contoh Arsitektur

    [User WhatsApp]
    |
    v
    [Twilio Programmable Messaging]
    |
    v
    [Webhook Endpoint (Backend Anda)]
    |
    +--> [Database: Chat History]
    |
    +--> [Logic: Auto-reply/Agent]
    |
    +--> [Twilio API: Send Message]
    |
    v
    [User WhatsApp]

3.  Struktur Tabel Supabase (PostgreSQL)
    Buat tabel messages di Supabase dengan struktur berikut:

        create table messages (
        id uuid primary key default gen_random_uuid(),
        from_number text not null,
        to_number text not null,
        body text not null,
        message_sid text,
        timestamp timestamptz not null default now(),
        direction text check (direction in ('inbound', 'outbound')) not null
        );

        Struktur tabel saya saat ini:
        create table public.messages (

    id uuid not null default gen_random_uuid (),
    conversation_id uuid null,
    message_sid text null,
    direction text not null,
    message_type text null default 'text'::text,
    content text null,
    media_url text null,
    media_content_type text null,
    sent_by uuid null,
    timestamp timestamp with time zone not null,
    created_at timestamp with time zone null default now(),
    constraint messages_pkey primary key (id),
    constraint messages_message_sid_key unique (message_sid),
    constraint messages_conversation_id_fkey foreign KEY (conversation_id) references conversations (id) on delete CASCADE,
    constraint messages_sent_by_fkey foreign KEY (sent_by) references profiles (id),
    constraint messages_direction_check check (
    (
    direction = any (array['inbound'::text, 'outbound'::text])
    )
    ),
    constraint messages_message_type_check check (
    (
    message_type = any (
    array[
    'text'::text,
    'image'::text,
    'document'::text,
    'audio'::text,
    'video'::text
    ]
    )
    )
    )
    ) TABLESPACE pg_default;

    create index IF not exists idx_messages_conversation_timestamp on public.messages using btree (conversation_id, "timestamp" desc) TABLESPACE pg_default;

    create index IF not exists idx_messages_direction_timestamp on public.messages using btree (direction, "timestamp" desc) TABLESPACE pg_default;

4.  Contoh Webhook Handler (Node.js + Supabase JS Client)

    // app.js
    const express = require('express');
    const bodyParser = require('body-parser');
    const { createClient } = require('@supabase/supabase-js');
    const twilio = require('twilio');

    const app = express();
    app.use(bodyParser.urlencoded({ extended: false }));

    // Supabase setup
    const supabaseUrl = 'https://your-project.supabase.co';
    const supabaseKey = 'your-service-role-key'; // Gunakan service role key untuk server-side
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Twilio setup
    const accountSid = 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const authToken = 'your_auth_token';
    const client = twilio(accountSid, authToken);

    // Webhook endpoint
    app.post('/webhook', async (req, res) => {
    const from = req.body.From; // e.g. 'whatsapp:+628123456789'
    const to = req.body.To;
    const body = req.body.Body;
    const messageSid = req.body.MessageSid;
    const timestamp = new Date();

    // 1. Simpan pesan masuk ke Supabase
    const { error: insertError } = await supabase
    .from('messages')
    .insert([{
    from_number: from,
    to_number: to,
    body: body,
    message_sid: messageSid,
    timestamp: timestamp,
    direction: 'inbound'
    }]);
    if (insertError) {
    console.error('Supabase insert error:', insertError);
    return res.status(500).send('Database error');
    }

    // 2. Simpan balasan ke Supabase
    const { error: replyError } = await supabase
    .from('messages')
    .insert([{
    from_number: to,
    to_number: from,
    body: reply,
    timestamp: new Date(),
    direction: 'outbound'
    }]);
    if (replyError) {
    console.error('Supabase insert error (reply):', replyError);
    // Lanjutkan proses, tapi log error
    }

    // 4. Kirim balasan ke user via Twilio API
    try {
    await client.messages.create({
    from: to,
    to: from,
    body: reply
    });
    } catch (err) {
    console.error('Twilio send error:', err);
    // Anda bisa retry atau log error untuk monitoring
    }

    res.status(200).send('OK');
    });

    app.listen(3000, () => {
    console.log('Server running on port 3000');
    });

5.  Penerimaan Pesan Media (Webhook Handler)
    Saat user mengirim media (gambar, file, dsb) ke WhatsApp bisnis Anda, Twilio akan mengirim webhook dengan parameter tambahan:
    NumMedia: jumlah media yang dikirim
    MediaUrl{N}: URL file media (misal, MediaUrl0)
    MediaContentType{N}: tipe file (misal, image/jpeg)
    Contoh Handler Node.js + Supabase
    Copy code block
    app.post('/webhook', async (req, res) => {
    const from = req.body.From;
    const to = req.body.To;
    const body = req.body.Body;
    const messageSid = req.body.MessageSid;
    const timestamp = new Date();
    const numMedia = parseInt(req.body.NumMedia, 10);
    // Ambil media jika ada
    let media = [];
    for (let i = 0; i < numMedia; i++) {
    media.push({
    url: req.body[`MediaUrl${i}`],
    contentType: req.body[`MediaContentType${i}`]
    });
    }
    // Simpan pesan ke Supabase
    const { error: insertError } = await supabase
    .from('messages')
    .insert([{
    from_number: from,
    to_number: to,
    body: body,
    message_sid: messageSid,
    timestamp: timestamp,
    direction: 'inbound',
    media: media.length > 0 ? JSON.stringify(media) : null
    }]);
    if (insertError) {
    console.error('Supabase insert error:', insertError);
    return res.status(500).send('Database error');
    }
    await client.messages.create({
    from: to,
    to: from,
    body: reply
    });
    res.status(200).send('OK');
    });
    Catatan:

    Tambahkan kolom media (type: text/jsonb) pada tabel Supabase Anda untuk menyimpan array media. 2. Pengiriman Pesan Media ke User (Outbound)
    Untuk mengirim media (gambar, file, dsb) ke user WhatsApp, gunakan parameter mediaUrl pada Twilio API.

    Contoh Pengiriman Media

    Copy code block
    await client.messages.create({
    from: 'whatsapp:+14155238886', // Ganti dengan nomor WhatsApp Twilio Anda
    to: 'whatsapp:+6281234567890', // Nomor tujuan
    body: 'Ini gambar untuk Anda!',
    mediaUrl: ['https://example.com/path/to/image.jpg'] // Bisa array untuk multi-media
    });
    Anda bisa mengirim lebih dari satu file (maksimal 10 media per pesan).
    File harus dapat diakses publik (publicly accessible URL).

6.  Contoh Query Menampilkan Chat History per User (Supabase SQL)

    select \* from messages
    where from_number = 'whatsapp:+628123456789'
    or to_number = 'whatsapp:+628123456789'
    order by timestamp asc;

7.  Best Practice
    A. Keamanan
    Validasi request: Pastikan webhook hanya menerima request dari Twilio (gunakan Twilio signature validation).
    Sanitasi input: Hindari SQL injection/XSS jika menggunakan query manual.
    B. Penyimpanan History
    Simpan semua pesan (inbound & outbound) dengan metadata: from, to, body, timestamp, direction, messageSid.
    Gunakan index pada field from/to untuk query cepat per user.
    C. Skalabilitas
    Gunakan database yang scalable (MongoDB, PostgreSQL, dsb).
    Pisahkan logic webhook handler dan logic balasan (pakai queue jika traffic tinggi).
    D. Pengelolaan Chat
    Simpan context percakapan per user (misal, session, last message, dsb).
    Jika ada agent, simpan mapping antara user dan agent.
    E. Monitoring & Logging
    Log semua event penting (pesan masuk, pesan keluar, error).
    Pantau error dan retry jika pengiriman balasan gagal.
    F. Pengiriman Balasan
    Balas pesan secepat mungkin (Twilio expect response < 15 detik).
    Untuk balasan yang butuh waktu lama, kirim 200 OK dulu, lalu balas via API secara async.
    G. Privasi & Kepatuhan
    Enkripsi data sensitif.
    Hapus data sesuai kebijakan privasi Anda.
    H. Gunakan Service Role Key hanya di backend/server, jangan expose di frontend.
    I. Validasi request: Implementasikan validasi Twilio signature untuk keamanan webhook.
    J. Indexing: Tambahkan index pada from_number dan to_number untuk query history per user.
    K. Error Handling: Log error Supabase dan Twilio, serta monitoring untuk retry jika perlu.
    L. Scalability: Untuk traffic tinggi, gunakan queue/worker untuk proses balasan.
    M. Privacy: Enkripsi data sensitif jika diperlukan, dan patuhi kebijakan privasi.
    N. Jangan simpan file media di database—simpan hanya URL dan content type.
    O. Download media dari Twilio jika ingin backup: Media URL dari Twilio hanya aktif selama 2 minggu.
    P. Validasi tipe file sebelum proses lebih lanjut.
    Q. Bersihkan media lama jika sudah tidak diperlukan, untuk efisiensi storage.

8.  Alur Chat Dua Arah
    User kirim pesan → Webhook → Simpan ke DB → (Logic/Agent/Auto-reply) → Simpan balasan ke DB → Kirim balasan via Twilio API → User terima balasan.
