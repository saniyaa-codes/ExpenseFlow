import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertTriangle, Target, Shield, Info } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import {
  requestNotificationPermission,
} from '../../utils/mobileNotification';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Ensure permission is requested quietly so phone notifications work
    if ('Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission().catch(() => {});
    }
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'budget_alert':
        return <AlertTriangle size={18} className="text-warning" />;
      case 'goal_milestone':
        return <Target size={18} className="text-success" />;
      case 'security':
      case 'account_alert':
        return <Shield size={18} className="text-danger" />;
      default:
        return <Info size={18} className="text-accent" />;
    }
  };

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Notifications</h2>
          <p className="ef-page-subtitle">Alerts, threshold warnings, and savings milestones.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" icon={CheckCheck} onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="surface-card ef-notif-card">
        {isLoading ? (
          <div className="ef-table-loading">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="ef-empty-state" style={{ padding: '48px 24px' }}>
            <Bell size={36} className="text-muted" />
            <h3>No Notifications</h3>
            <p>You have zero unread alerts. You are all caught up!</p>
          </div>
        ) : (
          <div className="ef-notif-list">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`ef-notif-row ${!n.isRead ? 'ef-notif-row--unread' : ''}`}
                onClick={() => !n.isRead && handleMarkAsRead(n._id)}
              >
                <div className="ef-notif-icon-wrap">{getIcon(n.type)}</div>
                <div className="ef-notif-content">
                  <div className="ef-notif-head">
                    <strong>{n.title}</strong>
                    <span className="ef-notif-time">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="ef-notif-msg">{n.message}</p>
                </div>
                {!n.isRead && <span className="ef-unread-badge" title="Unread alert" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
