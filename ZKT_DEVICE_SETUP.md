# ZKTeco Device Configuration Guide

This guide explains how to configure your ZKTeco attendance device to communicate with the application. The system supports two modes: **ADMS (Cloud Server)** for real-time synchronization and **SDK (Direct IP)** for manual management.

---

## 1. Network Settings (On the Device)

Before connecting to the server, ensure the device is on your local network.

1.  Go to **Menu** -> **Comm.** -> **Ethernet**.
2.  **IP Address**: Assign a unique static IP (e.g., `192.168.1.201`).
3.  **Subnet Mask**: Usually `255.255.255.0`.
4.  **Gateway**: Your router's IP (e.g., `192.168.1.1`).
5.  **DNS**: Use `8.8.8.8` or your router's IP.
6.  **TCP Port**: Default is `4370` (used for SDK mode).

---

## 2. ADMS (Cloud Server) Setup

This is the recommended method for real-time data sync. The device will "push" logs to the server automatically.

### Server Details
- **Server Address**: `YOUR_SERVER_IP_OR_DOMAIN` (e.g., `attendance.shaktatechnology.com`)
- **Server Port**: `80` (for HTTP) or `443` (for HTTPS)
- **Endpoint Path**: `/iclock/cdata` (Most devices add this automatically)

### Steps on Device:
1.  Go to **Menu** -> **Comm.** -> **ADMS** (or **Cloud Server Settings** on newer models).
2.  **Enable Domain Name**: 
    - Set to **ON** if you are using a domain name (e.g., `api.yoursite.com`).
    - Set to **OFF** if you are using a raw IP address.
3.  **Server Address**: Enter your server IP or Domain.
4.  **Server Port**: Enter `80` (or `443`).
5.  **Enable Proxy Server**: **OFF**.
6.  **HTTPS**: Set to **ON** only if your server uses SSL/HTTPS.

> [!IMPORTANT]
> Ensure the server's firewall allows incoming traffic on the specified port (80/443).

---

## 3. SDK (Direct IP) Setup

Used by the backend to manually set/remove users or fetch logs if ADMS is not active.

1.  The device must have a **Static IP**.
2.  In the Laravel `.env` file, configure:
    ```env
    ZKT_DEVICE_IP=192.168.1.201
    ZKT_DEVICE_PORT=4370
    ```
3.  Ensure the server can "Ping" the device IP.

---

## 4. Verification

### Check Connection
- If using **ADMS**, the device screen should show a "Cloud" icon or "Globe" icon (usually turns blue/green when connected).
- Check the Laravel logs: `tail -f storage/logs/laravel.log`. Look for `ZKT ADMS Handshake from SN: ...`.

### Common Issues
| Issue | Solution |
| :--- | :--- |
| **No "Cloud" icon** | Check Gateway and DNS settings. Ensure the device can reach the internet. |
| **404 Error in logs** | Ensure the routes are defined in `routes/web.php` and not protected by CSRF. |
| **Logs not appearing** | Ensure `Timezone` on the device matches the server (`GMT+5:45` for Nepal). |

---

## 5. Summary of Endpoints

| Purpose | Method | Endpoint |
| :--- | :--- | :--- |
| **Handshake** | GET | `/iclock/cdata?SN=DEVICE_SERIAL` |
| **Push Logs** | POST | `/iclock/cdata?SN=DEVICE_SERIAL&table=ATTLOG` |
| **Fetch Commands** | GET | `/iclock/getrequest?SN=DEVICE_SERIAL` |

---
*Created by Antigravity for Shakta Technology*
