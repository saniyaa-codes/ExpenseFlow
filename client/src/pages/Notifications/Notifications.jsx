import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Target, Shield, Info, Smartphone, Radio } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  requestNotificationPermission,
  getNotificationPermission,
  triggerMobileNotification,
} from '../../utils/mobileNotification';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [permStatus, setPermStatus] = useState(getNotificationPermission());

  const handleEnableDeviceAlerts = async () => {
    const res = await requestNotificationPermission();
    setPermStatus(res);
    if (res === 'granted') {
      triggerMobileNotification(
        '🔔 Smartphone Notifications Enabled',
        'ExpenseFlow will now buzz and display popup alerts whenever you spend 50%, 75%, 90%, or 100% of your budget.'
      );
    }
  };

  const handleTestAlert = () => {
    triggerMobileNotification(
      '⚠️ Test Budget Alert: 75% Reached',
      'This is a sample phone popup & vibration notification for ExpenseFlow budget alerts.'
    );
  };

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

      {/* Smartphone Push & Vibration Notification Setup Card */}
      <div className="surface-card ef-phone-notif-card">
        <div className="ef-phone-notif-left">
          <div className="ef-phone-icon-wrap">
            <Smartphone size={22} className="text-accent" />
          </div>
          <div className="ef-phone-info">
            <div className="ef-phone-title-row">
              <h4>Smartphone & Browser Alert Popups</h4>
              <Badge variant={permStatus === 'granted' ? 'success' : 'warning'} size="sm">
                {permStatus === 'granted' ? 'Active on This Device' : 'Permission Required'}
              </Badge>
            </div>
            <p>
              Receive instant screen popups and phone vibration at <strong>50%, 75%, 90%, and 100%</strong> of your budget. (Instant email alerts are also sent directly to your phone for all 4 thresholds).
            </p>
          </div>
        </div>

        <div className="ef-phone-notif-actions">
          {permStatus === 'granted' ? (
            <Button variant="outline" size="sm" icon={Radio} onClick={handleTestAlert}>
              Test Phone Alert & Buzz
            </Button>
          ) : (
            <Button variant="primary" size="sm" icon={Bell} onClick={handleEnableDeviceAlerts}>
              Enable Phone Notifications
            </Button>
          )}
        </div>
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
                      {new Date(n.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
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
