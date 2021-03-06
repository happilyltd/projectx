import Dropzone from 'dropzone';
import AlbumListView from './AlbumListView';
import AlbumView from './AlbumView';
import ImageView from './ImageView';
import HomepageView from './HomepageView';
import ModalViewWrapper from './ModalViewWrapper';
import SignInView from './SignInView';
import SignUpView from './SignUpView';
import ProfileView from './ProfileView';
import ZeroClipboard from 'zeroclipboard';
import shortId from 'shortid';

var NotificationView = Backbone.View.extend({
	events: {
		'click': 'remove'
	},
	render: function () {
		this.undelegateEvents();
		this.$el = $('<li></li>');
		this.$el.addClass('notification');
		var notification = this.model.notification;
		this.$el.text(notification.message);
		if (notification.type === 'success') {
			this.$el.addClass('success');
		} else if (notification.type === 'error') {
			this.$el.addClass('error');
		} else if (notification.type === 'info') {
			this.$el.addClass('info');
		} else if (notification.type === 'warning') {
			this.$el.addClass('warning');
		}
		this.delegateEvents();
		return this;
	},
	remove: function () {
		this.$el.addClass('removed');
		setTimeout(_.bind(Backbone.View.prototype.remove, this), 460);
	},
	visible: function () {
		return !this.$el.hasClass('removed');
	}
});

var HeaderView = Backbone.View.extend({
	headerTemplate: require('../../../../views/partials/header.handlebars'),
	initialize: function () {
		this.listenTo(this.model.user, 'change', this.render);
	},
	render: function () {
		var viewModel = {};
		if (this.model.user.get('email')) {
			viewModel.user = this.model.user.toJSON();
		}
		let headerRendered = this.headerTemplate(viewModel);
		this.$el.html(headerRendered);
	}
});

var ContainerView = Backbone.View.extend({
	events: {
		'click a[href$="/sign-in"]': 'openSignInModal',
		'click a[href$="/sign-up"]': 'openSignUpModal',
		'click .internal-link' : 'handleInternalLink',
		'mousedown .autohighlight': 'highlightShortLink',
		'click .autohighlight': 'highlightShortLink',
		'keypress .no-edit': 'preventEditing',
		'keyup .no-edit': 'preventEditing',
		'keydown .no-edit': 'preventEditing'
	},
	initialize: function () {
		console.log('Starting model:', this.model);
		console.log('Starting collection:', this.collection);

		if (!this.model) {
			this.model = {};
		}

		if (!this.model.user) {
			this.model.user = new Backbone.Model();
		}

		this.currentDomainRegex = new RegExp('^' + window.location.origin);

		this.notificationViews = {};

		this.viewState = new Backbone.Model({
			firstLoad: true
		});

		this.headerView = new HeaderView({
			el: this.$('header')[0],
			model: this.model
		});

		this.albumListView = new AlbumListView({
			el: this.$('#page-container')[0],
			collection: this.collection,
			model: this.model
		});

		this.albumView = new AlbumView({
			el: this.$('#page-container')[0],
			model: this.model
		});

		this.imageView = new ImageView({
			el: this.$('#page-container')[0],
			model: this.model
		});

		this.homepageView = new HomepageView({
			el: this.$('#page-container')[0],
			collection: this.collection,
			model: this.model
		});

		this.profileView = new ProfileView({
			el: this.$('#page-container')[0],
			collection: this.collection,
			model: this.model
		});

		this.signInView = new SignInView({
            el: $('#page-container')[0]
        });

        this.listenTo(this.signInView, 'signedIn', function (response) {
			this.model.user.set(response.user);
			this.showNotification({
				type: 'success',
				message: 'Welcome back!'
			});
			Backbone.history.navigate('/a', { trigger : true });
        });

		this.listenTo(this.homepageView, 'notification', this.showNotification);
		this.listenTo(this.homepageView, 'finishedUpload', function (url) {
			this.navigateInternalLink(url);
		});

		this.listenTo(this.albumView, 'deleted', function () {
			this.navigateInternalLink('/a');
		});

		var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
		var isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);

		if (isChrome) {
			this.$el.addClass('chrome');
		} else if (isSafari) {
			this.$el.addClass('safari');
		}

		if (!window.ClipboardEvent && ZeroClipboard.isFlashUnusable()) {
			$('body').addClass('not-copyable');
		} else {
			$('body').addClass('copyable');
		}

		// this.listenTo(this.model.user, 'change', )
	},
	showNotification: function (notification) {
		var notificationId = notification.id || shortId.generate();
		if (this.notificationViews[notificationId] && this.notificationViews[notificationId].visible()) {
			return;
		}
		var newNotificationView = new NotificationView({
			model: {
				notification: notification
			}
		});
		this.notificationViews[notificationId] = newNotificationView;
		this.$('#notifications').append(newNotificationView.render().$el);
	},
	handleInternalLink: function (e) {
		var link = $(e.currentTarget);
		var url = link.attr('href');
		e.preventDefault();
		this.navigateInternalLink(url);
	},
	navigateInternalLink: function (url) {
		url = url.replace(this.currentDomainRegex, '');
		Backbone.history.navigate(url, { trigger : true });
	},
	shouldFetch: function () {
		return !this.viewState.get('firstLoad');
	},
	showAlbumListView: function () {
		this.loadView(undefined, () => {
			this.albumListView.render();
			this.collection.albums.fetch();
		}, () => {
			this.albumListView.delegateEvents();
			this.albumListView.initializeDropzone();
		}.bind(this));
	},
	showAlbumView: function (shortName) {
		this.loadView(function () {
			this.albumView.initializeDropzone();
			this.albumView.initializeZeroClipboard();
			this.albumView.updateCopyLink();
		}.bind(this), function () {
			this.model.album.set('shortName', shortName);
			this.model.album.fetch();
		}.bind(this));
	},
	showImageView: function (albumShortName, imageShortName) {
		this.loadView(() => {
		}, () => {
			var fileModel;
			if (this.model.album) {
				fileModel = this.model.album.getFileWithShortname(imageShortName);
			}
			this.imageView = new ImageView({
				el: this.$('#page-container')[0],
				model: {
					album: this.model.album,
					file: fileModel
				}
			});
			this.imageView.render();
		});
	},
	showHomepageView: function () {
		this.loadView(() => {
			this.homepageView.initializeDropzone();
		}, () => {
			this.homepageView.render();
		}, () => {
			this.homepageView.delegateEvents();
		});
	},
	showProfileView: function () {
		this.loadView(undefined, () => {
			this.profileView.render();
		});
	},
	showSignInView: function () {
		this.loadView(undefined, () => {
			this.signInView.render();
		});
	},
	/* DOM MANIPULATION */
	highlightShortLink: function (e) {
		e.preventDefault();
		let target = $(e.currentTarget);
		target.select();
	},
	openSignInModal: function (e) {
		e.preventDefault();
		e.stopPropagation();
		let SignInModalView = ModalViewWrapper(SignInView);
		let modalView = new SignInModalView();
		modalView.signInTemplate = require('../../../../views/signInModal.handlebars');
		modalView.render().showModal();
		this.listenTo(modalView, 'signedIn', function (response) {
			this.model.user.set(response.user);
			this.showNotification({
				type: 'success',
				message: 'Welcome back!'
			});
			modalView.hideModal();
		});
	},
	openSignUpModal: function (e) {
		e.preventDefault();
		e.stopPropagation();
		let SignUpModalView = ModalViewWrapper(SignUpView);
		let modalView = new SignUpModalView();
		modalView.signUpTemplate = require('../../../../views/signUpModal.handlebars');
		modalView.render().showModal();
		this.listenTo(modalView, 'signedIn', function (response) {
			this.model.user.set(response.user);
			this.showNotification({
				type: 'success',
				message: 'Congrats on signing up!'
			});
			modalView.hideModal();
		});

		this.listenTo(modalView, 'signUpFailed', function () {
			this.showNotification({
				type: 'warning',
				message: 'Sorry, something went wrong trying to sign you up',
				id: 'signUpFailed'
			});
		});

		this.listenTo(modalView, 'emailTaken', function () {
			this.showNotification({
				type: 'warning',
				message: 'Sorry, that email address is already taken',
				id: 'emailTaken'
			});
		});
	},
	preventEditing: function (e) {
		e.preventDefault();
	},
	/**
	 * Execute a different callback depending on whether this is the first load
	 * of the page or not. If it is, it'll do the first thing then set the
	 * firstLoad state to false. Otherwise it'll do the other function.
	 * @param  {[type]} firstCallback     [description]
	 * @param  {[type]} otherwiseCallback [description]
	 * @return {[type]}                   [description]
	 */
	loadView: function (firstCallback = () => {}, otherwiseCallback = () => {}, alwaysAfterCallback = () => {}) {
		let isFirstLoad = this.viewState.get('firstLoad');
		if (isFirstLoad) {
			firstCallback(this);
		} else {
			otherwiseCallback(this);
		}
		alwaysAfterCallback(this);
		this.viewState.set('firstLoad', false);
	}
});

export default ContainerView;
