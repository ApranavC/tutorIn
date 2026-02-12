# Redirection Logic & Implementation Guide

This guide documents the URL redirection patterns used in the current project, specifically focusing on **Post-Class Redirection (VideoSDK)**, **Authentication Redirection**, and **Role-Based Navigation**. It provides steps on how to implement this in other projects and lists common pitfalls.

---

## 1. Post-Class Redirection (VideoSDK Integration)

When using VideoSDK, you often want to redirect the user to a specific page (e.g., feedback form, dashboard) after they leave the meeting.

### **The Logic**
The logic constructs a dynamic URL based on the user's **role** and current **context** (like `courseId`), and passes it to the VideoSDK configuration via the `redirectOnLeave` property.

### **Implementation Steps**

1.  **Determine the Destination Base URL**:
    Identify where users should go. This often depends on their role.
    -   *Student* -> `rate` or `dashboard`
    -   *Teacher* -> `summary` or `dashboard`
    -   *Default* -> `home`

2.  **Preserve Context (Query Params)**:
    If your app relies on query parameters (e.g., `courseId`, `referralSource`), ensure these are appended to the redirect URL so context isn't lost.

3.  **Construct the Absolute URL**:
    VideoSDK (and many external services) requires an absolute URL (including `http/https` and domain). Use `window.location.origin` to dynamically get the current domain.

### **Code Example**

```typescript
// Inside your Video Call Component (e.g., ClassRoomContent)

const { user, profile } = useAuth();
const searchParams = useSearchParams();
const courseId = searchParams.get("courseId");
const classId = "123"; // or from params

// 1. Determine redirect logic based on Role
let redirectUrl = window.location.origin;

if (profile?.role === "teacher") {
    redirectUrl += `/teacher/class/${classId}/finish`;
} else {
    redirectUrl += `/student/class/${classId}/rate`;
}

// 2. Append Context (Course ID)
if (courseId) {
    redirectUrl += `?courseId=${courseId}`;
}

console.log("Redirecting to:", redirectUrl);

// 3. Pass to VideoSDK Config
const params = new URLSearchParams({
    // ... active meeting params ...
    redirectOnLeave: redirectUrl, // <--- CRITICAL
});

const meetingUrl = \`https://embed.videosdk.live/rtc-js-prebuilt/0.3.43/?\${params.toString()}\`;
```

---

## 2. Authentication & Role-Based Redirection

This protects pages from unauthorized access and ensures users land on the correct dashboard.

### **The Logic**
-   **Middleware/Effect**: Run a check on component mount.
-   **Loading State**: preventing redirects while auth state is initializing.
-   **Role Routing**: If a student tries to access a teacher page, redirect them.

### **Implementation Steps**

1.  **Wait for Auth Load**: Always checks `!loading` before redirecting.
2.  **Check User Existence**: If `!user`, send to `/login`.
3.  **Check Role Compatibility**: If user exists but has wrong role, redirect to their allowed area.

### **Code Example (Dashboard Protection)**

```typescript
// app/dashboard/page.tsx
useEffect(() => {
    if (!loading) {
        // 1. Not Logged In
        if (!user) {
            router.push("/login");
            return;
        }

        // 2. Role Based Redirection (Optional Enforcement)
        if (profile?.role === "student" && pathname.startsWith("/teacher")) {
            router.push("/student/dashboard");
        }
    }
}, [user, profile, loading, router]);
```

---

## 3. Back Button Trapping (Browser History)

Use this when you want to prevent a user from accidentally leaving a critical flow (like a live class) via the browser back button, or to ensure "Back" takes them to a logical parent page instead of the previous history state.

### **The Logic**
-   **Push State**: Manually push a state to history stack upon entering the critical page.
-   **Event Listener**: Listen for `popstate` (back button press).
-   **Intercept**: When `popstate` fires, prevent default (if possible) or immediately redirect to a safe "Dashboard" URL instead of letting the browser go back to the *actual* previous page (which might be a login screen or stale state).

### **Code Example**

```typescript
useEffect(() => {
    // 1. Push a dummy state to the history stack
    window.history.pushState(null, "", window.location.href);

    const handlePopState = (event: PopStateEvent) => {
        event.preventDefault(); // Note: This doesn't stop navigation in all browsers, 
                                // but the router.replace below fixes the flow.
        
        // 2. Define where 'Back' should ACTUALLY go
        const safeBackUrl = profile?.role === "teacher" 
            ? "/teacher/dashboard" 
            : "/student/dashboard";

        // 3. Force replace current URL
        router.replace(safeBackUrl);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
}, [router, profile]);
```

---

## 4. Things to Take Care Of (Checklist)

### **⚠️ Security & Safety**
-   **Valid Redirects**: changing the post-class redirect URL based on user input is dangerous (Open Redirect Vulnerability). **Always** validate or construct the URL internally using hardcoded paths + valid IDs. Never simply do `router.push(searchParams.get('returnUrl'))`.
-   **Auth State**: Ensure `loading` is false before making redirect decisions. Otherwise, you might kick logged-in users out because the auth request hasn't finished.

### **⚠️ User Experience (UX)**
-   **Context Loss**: If a user was filterting a list, clicked into a class, and then leaves the class, try to redirect them back to the *filtered* list (using query params).
-   **Infinite Loops**: Be careful not to redirect a user to a page that immediately redirects them back. (e.g., Login Page -> Dashboard -> checks auth -> Logic Error -> Login Page).

### **⚠️ Technical Pitfalls**
-   **Absolute vs Relative**: APIs (like VideoSDK) usually need **Absolute URLs** (`https://...`). Next.js `router.push` uses **Relative URLs** (`/dashboard`). Be consistent.
-   **`window` availability**: In Next.js (SSR), `window` is not available on the server. Ensure these running blocks are inside `useEffect` or check `if (typeof window !== "undefined")`.
-   **Mobile/WebView**: If implementing this in a WebView (React Native), `window.location.origin` might be `file://` or non-standard. You might need to hardcode the domain environment variable (e.g., `process.env.NEXT_PUBLIC_APP_URL`).

